import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api.v1.router import api_router
from app.websocket.progress import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("alteraflux.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarrage
    logger.info("Démarrage d'AlteraFlux API Gateway...")
    await init_db()
    await manager.init_redis()
    yield
    # Arrêt
    logger.info("Arrêt d'AlteraFlux API Gateway...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Architecture asynchrone universelle de conversion de fichiers, vidéos, audios, documents et code.",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS pour Next.js et clients externes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En dev, permissif pour permettre localhost:3000 sans accroc
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montage du routeur v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# Endpoint WebSocket temps réel pour streaming de progression
@app.websocket("/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    await manager.connect(websocket, job_id)
    try:
        while True:
            # Maintient la connexion ouverte et gère d'éventuels pings du client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)
    except Exception as e:
        logger.warning(f"Erreur socket job {job_id}: {e}")
        manager.disconnect(websocket, job_id)

@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "documentation": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }
