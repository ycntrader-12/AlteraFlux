from fastapi import APIRouter
from app.api.v1.endpoints import conversions, storage, presets, health

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(presets.router, prefix="/presets", tags=["Presets"])
api_router.include_router(storage.router, prefix="/storage", tags=["Storage"])
api_router.include_router(conversions.router, prefix="/conversions", tags=["Conversions"])
