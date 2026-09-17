import asyncio
import json
import logging
from typing import Dict, Set
from fastapi import WebSocket
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Map: job_id -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis_client = None
        self._listener_task = None

    async def init_redis(self):
        try:
            self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("Connexion Redis Pub/Sub WebSocket active.")
        except Exception as e:
            logger.warning(f"Impossible de se connecter à Redis pour les WebSockets: {e}")
            self.redis_client = None

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
            # Démarrer l'écouteur Redis pour ce job
            asyncio.create_task(self._listen_to_job_channel(job_id))
        self.active_connections[job_id].add(websocket)
        logger.info(f"Client WebSocket connecté au job: {job_id}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        logger.info(f"Client WebSocket déconnecté du job: {job_id}")

    async def broadcast_to_job(self, job_id: str, message: dict):
        """Envoie directement aux sockets connectés en mémoire"""
        if job_id in self.active_connections:
            dead_sockets = set()
            text_payload = json.dumps(message)
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_text(text_payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_connections[job_id].discard(dead)

    async def publish_progress(self, job_id: str, data: dict):
        """Publie une progression sur Redis Pub/Sub ou en mémoire locale"""
        if self.redis_client:
            try:
                await self.redis_client.publish(f"job_progress:{job_id}", json.dumps(data))
                return
            except Exception as e:
                logger.warning(f"Erreur publication Redis: {e}")
        # Fallback direct en mémoire
        await self.broadcast_to_job(job_id, data)

    async def _listen_to_job_channel(self, job_id: str):
        """Écoute les messages Redis émis par le Worker Celery pour ce job spécifique"""
        if not self.redis_client:
            return

        try:
            pubsub = self.redis_client.pubsub()
            channel_name = f"job_progress:{job_id}"
            await pubsub.subscribe(channel_name)

            while job_id in self.active_connections and self.active_connections[job_id]:
                try:
                    message = await asyncio.wait_for(pubsub.get_message(ignore_subscribe_messages=True), timeout=1.0)
                    if message and message.get("data"):
                        data = json.loads(message["data"])
                        await self.broadcast_to_job(job_id, data)
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.debug(f"Info écouteur {job_id}: {e}")
                    break

            await pubsub.unsubscribe(channel_name)
            await pubsub.close()
        except Exception as e:
            logger.warning(f"Erreur pubsub pour le job {job_id}: {e}")

manager = ConnectionManager()
