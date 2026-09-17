FROM python:3.11-slim

WORKDIR /app

# Installation des utilitaires système nécessaires aux conversions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    pandoc \
    libreoffice-writer \
    libreoffice-calc \
    nodejs \
    npm \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY workers/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code backend et workers (partage des modèles et config)
COPY backend /app/backend
COPY workers /app/workers

ENV PYTHONPATH="/app/backend:/app/workers:/app"

CMD ["celery", "-A", "workers.celery_app", "worker", "--loglevel=info", "--concurrency=4"]
