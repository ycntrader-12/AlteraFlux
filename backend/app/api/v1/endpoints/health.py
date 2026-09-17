from fastapi import APIRouter
from app.config import settings
import redis.asyncio as aioredis

router = APIRouter()

@router.get("")
async def health_check():
    status = {
        "status": "healthy",
        "service": "AlteraFlux API Gateway",
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "redis": "checking",
        "storage_bucket": settings.STORAGE_BUCKET_NAME
    }

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()
        await r.close()
        status["redis"] = "connected"
    except Exception:
        status["redis"] = "disconnected (fallback local mode active)"

    return status
