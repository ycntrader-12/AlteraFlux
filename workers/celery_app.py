import os
from celery import Celery
from celery.schedules import crontab

BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

app = Celery(
    "alteraflux_worker",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=["workers.tasks.conversion_tasks", "workers.tasks.cleanup_tasks"]
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 heure max pour les fichiers très lourds
    worker_prefetch_multiplier=1,  # Pour équilibrer les charges lourdes entre workers
)

# Tâches périodiques (Cron 24h éphémère)
app.conf.beat_schedule = {
    "purge-expired-files-hourly": {
        "task": "workers.tasks.cleanup_tasks.purge_expired_files",
        "schedule": crontab(minute=0),  # Toutes les heures
    },
}
