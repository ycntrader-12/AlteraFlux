import sys
import os
import uuid
import logging
from typing import List

# Résolution globale du chemin racine pour l'importation dynamique du module workers
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
workers_dir = os.path.join(BASE_DIR, "workers")
if workers_dir not in sys.path:
    sys.path.insert(0, workers_dir)

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.config import settings
from app.database import get_db
from app.models.job import ConversionJob
from app.schemas.job import JobCreate, JobResponse
from app.security.validator import detect_category, sanitize_filename, is_conversion_compatible, get_compatible_targets
from app.security.rate_limiter import check_conversion_rate_limit, record_conversion_usage
from app.storage import get_storage_provider
from app.websocket.progress import manager

logger = logging.getLogger(__name__)
router = APIRouter()

def dispatch_celery_task(job_id: str):
    """Essaie de déléguer la tâche au Worker Celery"""
    try:
        from celery import Celery
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
    Garantit l'exécution réelle du pipeline de conversion sans simulation fictive.
    """
    try:
        from workers.tasks.conversion_tasks import run_conversion_pipeline
        await run_conversion_pipeline(job_id)
    except Exception as e:
        logger.exception(f"Erreur lors de l'exécution du pipeline de conversion pour job {job_id}: {e}")
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            q = await session.execute(select(ConversionJob).where(ConversionJob.id == job_id))
            j = q.scalars().first()
            if j:
                j.status = "FAILED"
                j.stage = "Échec de la conversion"
                j.error_message = str(e)
                await session.commit()
        await manager.publish_progress(job_id, {
            "job_id": job_id,
            "progress": 0.0,
            "stage": "Échec de la conversion",
            "status": "FAILED",
            "error_message": str(e)
        })

@router.get("/cooldown")
async def get_conversion_cooldown(request: Request):
    """
    Renvoie le délai d'attente restant pour le client public (5 minutes entre 2 conversions).
    """
    is_allowed, remaining = check_conversion_rate_limit(request, settings.CONVERSION_COOLDOWN_SECONDS)
    return {
        "cooldown_seconds": settings.CONVERSION_COOLDOWN_SECONDS,
        "remaining_seconds": remaining,
        "is_allowed": is_allowed
    }

@router.get("/compatible-formats")
async def get_compatible_conversion_formats(source: str):
    """
    Renvoie la liste des formats cibles compatibles pour une extension source donnée.
    Permet au frontend de verrouiller ou filtrer la sélection des formats.
    """
    src = (source or "").lower().lstrip(".")
    targets = get_compatible_targets(src)
    return {
        "source_format": src,
        "compatible_targets": targets,
        "count": len(targets)
    }

@router.post("/jobs", response_model=JobResponse)
async def create_conversion_job(
    payload: JobCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une nouvelle tâche de conversion et l'ajoute à la file de traitement.
    Vérifie rigoureusement la compatibilité des formats avant validation et application du cooldown.
    """
    safe_filename = sanitize_filename(payload.filename)
    source_ext, detected_cat = detect_category(safe_filename)

    src_fmt = (payload.source_format or source_ext).lower().lstrip(".")
    tgt_fmt = payload.target_format.lower().lstrip(".")

    # 1. Validation stricte de la compatibilité source -> cible
    is_compat, reason = is_conversion_compatible(src_fmt, tgt_fmt)
    if not is_compat:
        raise HTTPException(
            status_code=400,
            detail=reason or f"La conversion de .{src_fmt.upper()} vers .{tgt_fmt.upper()} n'est pas possible."
        )

    # 2. Vérification du délai d'attente public
    is_allowed, remaining = check_conversion_rate_limit(request, settings.CONVERSION_COOLDOWN_SECONDS)
    if not is_allowed:
        minutes = remaining // 60
        seconds = remaining % 60
        time_str = f"{minutes}m {seconds:02d}s" if minutes > 0 else f"{seconds}s"
        raise HTTPException(
            status_code=429,
            detail=f"Délai d'attente public actif : vous devez patienter 5 minutes entre chaque conversion. Temps restant : {time_str}.",
            headers={"Retry-After": str(remaining)}
        )
    
    category = payload.category or detected_cat
    if category == "unknown":
        category = "document"

    new_job = ConversionJob(
        id=str(uuid.uuid4()),
        filename=safe_filename,
        source_key=payload.source_key,
        source_format=src_fmt,
        source_size_bytes=payload.source_size_bytes or 0,
        target_format=tgt_fmt,
        category=category,
        status="QUEUED",
        progress=0.0,
        stage="En attente de traitement...",
        options=payload.options or {}
    )

    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)

    # Activer le délai de 5 minutes pour ce client
    record_conversion_usage(request)

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
            key_to_use = j.result_key
            if key_to_use and hasattr(storage, "generate_presigned_download_url"):
                d["download_url"] = storage.generate_presigned_download_url(
                    key=key_to_use,
                    filename=j.result_filename or f"converted_{j.id}.{j.target_format}"
                )
            elif key_to_use:
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
        key_to_use = job.result_key
        if key_to_use and hasattr(storage, "generate_presigned_download_url"):
            d["download_url"] = storage.generate_presigned_download_url(
                key=key_to_use,
                filename=job.result_filename or f"converted_{job.id}.{job.target_format}"
            )
        elif key_to_use:
            d["download_url"] = f"/api/v1/conversions/jobs/{job.id}/download"

    return JobResponse(**d)

@router.get("/jobs/{job_id}/download")
async def download_conversion_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Télécharge le fichier issu de la conversion"""
    stmt = select(ConversionJob).where(ConversionJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Conversion non trouvée.")

    if job.status != "COMPLETED" or not job.result_key:
        raise HTTPException(status_code=400, detail="La conversion n'est pas encore terminée ou a échoué.")

    key_to_use = job.result_key
    filename = job.result_filename or f"converted_{job.id}.{job.target_format}"
    storage = get_storage_provider()

    if hasattr(storage, "_get_abs_path"):
        abs_path = storage._get_abs_path(key_to_use)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Fichier converti introuvable sur le stockage local.")
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
