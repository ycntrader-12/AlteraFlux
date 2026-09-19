import sys
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
workers_dir = os.path.join(BASE_DIR, "workers")
if workers_dir not in sys.path:
    sys.path.insert(0, workers_dir)

import shutil
import tempfile
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.job import ConversionJob
from app.security.validator import get_content_type, validate_file_integrity, is_conversion_compatible
from app.storage import get_storage_provider
from app.websocket.progress import manager
from workers.engines import get_engine_for_category
from workers.celery_app import app as celery_app

logger = logging.getLogger(__name__)

async def update_job_progress(job_id: str, progress: float, stage: str, status: str = "PROCESSING"):
    """Met à jour la progression dans Redis Pub/Sub et la base de données"""
    # 1. Émission temps réel immédiate sur Redis Pub/Sub / WebSockets
    await manager.publish_progress(job_id, {
        "job_id": job_id,
        "progress": progress,
        "stage": stage,
        "status": status
    })

    # 2. Sauvegarde en base de données
    try:
        async with AsyncSessionLocal() as session:
            stmt = select(ConversionJob).where(ConversionJob.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()
            if job:
                job.progress = progress
                job.stage = stage
                job.status = status
                await session.commit()
    except Exception as e:
        logger.warning(f"Erreur update DB pour job {job_id}: {e}")

async def run_conversion_pipeline(job_id: str):
    """Pipeline de conversion complet, sécurisé et isolé"""
    logger.info(f"--- Démarrage de la conversion pour le job: {job_id} ---")
    
    # 1. Récupération du job en base
    async with AsyncSessionLocal() as session:
        stmt = select(ConversionJob).where(ConversionJob.id == job_id)
        res = await session.execute(stmt)
        job = res.scalars().first()
        if not job:
            logger.error(f"Job {job_id} introuvable en base.")
            return

        source_key: str = str(job.source_key or "")
        filename: str = str(job.filename or "file")
        source_format: str = str(job.source_format or "").lower().lstrip(".")
        target_format: str = str(job.target_format or "").lower().lstrip(".")
        category: str = str(job.category or "")
        options: Dict[str, Any] = dict(job.options or {})

    # Vérification stricte de compatibilité
    is_comp, comp_err = is_conversion_compatible(source_format, target_format)
    if not is_comp:
        raise ValueError(f"Conversion impossible : {comp_err}")

    sandbox_dir = tempfile.mkdtemp(prefix=f"alteraflux_{job_id[:8]}_")
    try:
        await update_job_progress(job_id, 5.0, "Téléchargement du fichier source depuis le stockage...")
        
        # 2. Téléchargement du fichier source dans le sandbox
        storage = get_storage_provider()
        local_input_path = os.path.join(sandbox_dir, f"input.{source_format}")
        await storage.download_file_to_path(source_key, local_input_path)

        # 3. Validation de l'intégrité du fichier en entrée
        await update_job_progress(job_id, 8.0, "Validation de l'intégrité du fichier source...")
        is_valid_in, in_err = validate_file_integrity(local_input_path, source_format)
        if not is_valid_in:
            raise ValueError(f"Fichier source corrompu ou invalide : {in_err}")

        base_name = os.path.splitext(filename)[0]
        result_filename = f"{base_name}.{target_format}"
        local_output_path = os.path.join(sandbox_dir, result_filename)

        # 4. Callback de progression synchrone pontée vers l'asynchrone
        loop = asyncio.get_event_loop()
        def on_engine_progress(pct: float, current_stage: str):
            asyncio.run_coroutine_threadsafe(
                update_job_progress(job_id, pct, current_stage, "PROCESSING"),
                loop
            )

        # 5. Sélection et exécution du moteur
        engine = get_engine_for_category(category, source_format, target_format, on_engine_progress)
        engine_name = (category or source_format or "conversion").upper()
        await update_job_progress(job_id, 12.0, f"Exécution du moteur {engine_name}...")
        
        # Exécution dans un threadpool pour ne pas bloquer la boucle d'événements
        await asyncio.to_thread(
            engine.convert,
            local_input_path,
            local_output_path,
            source_format,
            target_format,
            options
        )

        # 6. Validation stricte du fichier généré en sortie (intégrité & taille > 0)
        await update_job_progress(job_id, 90.0, "Contrôle qualité et intégrité du fichier généré...")
        is_valid_out, out_err = validate_file_integrity(local_output_path, target_format)
        if not is_valid_out:
            raise RuntimeError(f"Le fichier converti est invalide ou corrompu : {out_err}")

        # 5. Téléversement du fichier converti vers le stockage S3/MinIO
        await update_job_progress(job_id, 92.0, "Téléversement du fichier converti...")
        result_key = f"results/{job_id}/{result_filename}"
        
        content_type = get_content_type(target_format)
        
        await storage.upload_from_path(local_output_path, result_key, content_type)
        result_size = os.path.getsize(local_output_path) if os.path.exists(local_output_path) else 0

        # Génération du lien de téléchargement direct
        download_url = storage.generate_presigned_download_url(key=result_key, filename=result_filename)

        # 6. Finalisation du job
        async with AsyncSessionLocal() as session:
            stmt = select(ConversionJob).where(ConversionJob.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()
            if job:
                job.status = "COMPLETED"
                job.progress = 100.0
                job.stage = "Conversion terminée avec succès !"
                job.result_key = result_key
                job.result_filename = result_filename
                job.result_size_bytes = result_size
                job.download_url = download_url
                await session.commit()

        # Notification finale WebSocket
        await manager.publish_progress(job_id, {
            "job_id": job_id,
            "progress": 100.0,
            "stage": "Conversion terminée avec succès !",
            "status": "COMPLETED",
            "result_key": result_key,
            "result_filename": result_filename,
            "result_size_bytes": result_size,
            "download_url": download_url
        })
        logger.info(f"--- Job {job_id} COMPLETED avec succès ! ---")

    except Exception as e:
        logger.exception(f"Erreur fatale lors de la conversion {job_id}: {e}")
        error_msg = str(e)
        async with AsyncSessionLocal() as session:
            stmt = select(ConversionJob).where(ConversionJob.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()
            if job:
                job.status = "FAILED"
                job.stage = "Échec de la conversion"
                job.error_message = error_msg
                await session.commit()

        await manager.publish_progress(job_id, {
            "job_id": job_id,
            "progress": 0.0,
            "stage": "Échec de la conversion",
            "status": "FAILED",
            "error_message": error_msg
        })
    finally:
        # Nettoyage rigoureux du sandbox temporaire
        if os.path.exists(sandbox_dir):
            shutil.rmtree(sandbox_dir, ignore_errors=True)

@celery_app.task(name="workers.tasks.conversion_tasks.execute_conversion", bind=True)
def execute_conversion(self, job_id: str):
    """Point d'entrée de la tâche Celery distribuée"""
    asyncio.run(run_conversion_pipeline(job_id))
