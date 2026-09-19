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

import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.job import ConversionJob
from app.storage import get_storage_provider
from workers.celery_app import app as celery_app

logger = logging.getLogger(__name__)

async def run_purge_expired_files():
    """Supprime les fichiers temporaires et tâches expirées (> 24h)"""
    logger.info("Lancement du nettoyage automatique des fichiers expirés (TTL 24h)...")
    now = datetime.now(timezone.utc)
    storage = get_storage_provider()
    deleted_count = 0

    try:
        async with AsyncSessionLocal() as session:
            stmt = select(ConversionJob).where(ConversionJob.expires_at < now)
            result = await session.execute(stmt)
            expired_jobs = result.scalars().all()

            for job in expired_jobs:
                if job.source_key:
                    await storage.delete_file(job.source_key)
                if job.result_key:
                    await storage.delete_file(job.result_key)
                
                await session.delete(job)
                deleted_count += 1

            await session.commit()
            logger.info(f"Nettoyage terminé : {deleted_count} conversions expirées purgées.")
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage périodique: {e}")

@celery_app.task(name="workers.tasks.cleanup_tasks.purge_expired_files")
def purge_expired_files():
    """Tâche périodique planifiée par Celery Beat"""
    asyncio.run(run_purge_expired_files())
