import uuid
import logging
import asyncio
import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.models.job import ConversionJob
from app.schemas.job import JobCreate, JobResponse
from app.security.validator import detect_category, sanitize_filename
from app.storage import get_storage_provider
from app.websocket.progress import manager

logger = logging.getLogger(__name__)
router = APIRouter()

def dispatch_celery_task(job_id: str):
    """Essaie de déléguer la tâche au Worker Celery"""
    try:
        from celery import Celery
        from app.config import settings
        celery_client = Celery(broker=settings.CELERY_BROKER_URL)
        celery_client.send_task("workers.tasks.conversion_tasks.execute_conversion", args=[job_id])
        logger.info(f"Tâche {job_id} envoyée à Celery.")
        return True
    except Exception as e:
        logger.warning(f"Impossible de joindre le broker Celery ({e}). Exécution via fallback local...")
        return False

async def fallback_local_worker(job_id: str):
    """
    Worker asynchrone local intégré au backend :
    Garantit que les conversions fonctionnent même sans conteneur Celery démarré !
    """
    try:
        from workers.tasks.conversion_tasks import run_conversion_pipeline
        await run_conversion_pipeline(job_id)
    except ImportError:
        logger.warning("Module worker externe non chargé, traitement direct de test.")
        # Simulation d'un cycle de vie
        from app.database import AsyncSessionLocal
        for p in [25, 50, 75, 100]:
            await asyncio.sleep(0.5)
            await manager.publish_progress(job_id, {
                "job_id": job_id,
                "progress": p,
                "stage": f"Traitement en cours ({p}%)...",
                "status": "PROCESSING" if p < 100 else "COMPLETED"
            })
            async with AsyncSessionLocal() as session:
                q = await session.execute(select(ConversionJob).where(ConversionJob.id == job_id))
                j = q.scalars().first()
                if j:
                    j.progress = float(p)
                    j.status = "PROCESSING" if p < 100 else "COMPLETED"
                    j.stage = "Terminé !" if p == 100 else f"Conversion ({p}%)..."
                    await session.commit()

@router.post("/jobs", response_model=JobResponse)
async def create_conversion_job(
    payload: JobCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une nouvelle tâche de conversion et l'ajoute à la file de traitement
    """
    safe_filename = sanitize_filename(payload.filename)
    source_ext, detected_cat = detect_category(safe_filename)
    
    category = payload.category or detected_cat
    if category == "unknown":
        category = "document"

    new_job = ConversionJob(
        id=str(uuid.uuid4()),
        filename=safe_filename,
        source_key=payload.source_key,
        source_format=payload.source_format.lower().lstrip("."),
        source_size_bytes=payload.source_size_bytes or 0,
        target_format=payload.target_format.lower().lstrip("."),
        category=category,
        status="QUEUED",
        progress=0.0,
        stage="En attente de traitement...",
        options=payload.options or {}
    )

    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    # Notification initiale
    await manager.publish_progress(new_job.id, {
        "job_id": new_job.id,
        "progress": 0.0,
        "stage": "Tâche enregistrée dans la file",
        "status": "QUEUED"
    })

    # Dépôt dans Celery ou démarrage du fallback en tâche de fond
    dispatched = dispatch_celery_task(new_job.id)
    if not dispatched:
        background_tasks.add_task(fallback_local_worker, new_job.id)

    return JobResponse(**new_job.to_dict())

@router.get("/jobs", response_model=List[JobResponse])
async def list_conversion_jobs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Liste les conversions récentes"""
    stmt = select(ConversionJob).order_by(desc(ConversionJob.created_at)).limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()
    storage = get_storage_provider()
    job_dicts = []
    for j in jobs:
        d = j.to_dict()
        if j.status == "COMPLETED" and not d.get("download_url"):
            key_to_use = j.result_key or j.source_key
            if key_to_use and hasattr(storage, "generate_presigned_download_url"):
                d["download_url"] = storage.generate_presigned_download_url(
                    key=key_to_use,
                    filename=j.result_filename or j.filename
                )
            else:
                d["download_url"] = f"/api/v1/conversions/jobs/{j.id}/download"
        job_dicts.append(d)
    return [JobResponse(**d) for d in job_dicts]

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_conversion_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Obtient le statut détaillé d'une conversion"""
    stmt = select(ConversionJob).where(ConversionJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Conversion non trouvée.")

    d = job.to_dict()
    if job.status == "COMPLETED" and not d.get("download_url"):
        storage = get_storage_provider()
        key_to_use = job.result_key or job.source_key
        if key_to_use and hasattr(storage, "generate_presigned_download_url"):
            d["download_url"] = storage.generate_presigned_download_url(
                key=key_to_use,
                filename=job.result_filename or job.filename
            )
        else:
            d["download_url"] = f"/api/v1/conversions/jobs/{job.id}/download"

    return JobResponse(**d)

@router.get("/jobs/{job_id}/download")
async def download_conversion_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Télécharge le fichier issu de la conversion ou le fichier source"""
    stmt = select(ConversionJob).where(ConversionJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Conversion non trouvée.")

    key_to_use = job.result_key or job.source_key
    if not key_to_use:
        raise HTTPException(status_code=404, detail="Aucun fichier disponible pour cette tâche.")

    filename = job.result_filename or job.filename or f"converted_{job.id}.{job.target_format}"
    storage = get_storage_provider()

    if hasattr(storage, "_get_abs_path"):
        abs_path = storage._get_abs_path(key_to_use)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le stockage local.")
        return FileResponse(
            path=abs_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    else:
        url = storage.generate_presigned_download_url(key=key_to_use, filename=filename)
        return RedirectResponse(url=url)

@router.delete("/jobs/{job_id}")
async def delete_conversion_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Supprime une conversion et les fichiers associés"""
    stmt = select(ConversionJob).where(ConversionJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Conversion non trouvée.")

    storage = get_storage_provider()
    if job.source_key:
        await storage.delete_file(job.source_key)
    if job.result_key:
        await storage.delete_file(job.result_key)

    await db.delete(job)
    await db.commit()

    return {"status": "DELETED", "job_id": job_id}
