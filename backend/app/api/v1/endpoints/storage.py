import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse, Response
from app.schemas.job import PresignedUrlRequest, PresignedUrlResponse
from app.storage import get_storage_provider
from app.security.validator import sanitize_filename, detect_category, get_content_type
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/upload-url", response_model=PresignedUrlResponse)
async def get_upload_url(request: PresignedUrlRequest):
    """
    Génère une URL présignée sécurisée pour téléverser le fichier source
    directement vers le stockage S3/MinIO ou Supabase Storage.
    """
    safe_name = sanitize_filename(request.filename)
    unique_id = str(uuid.uuid4())
    storage_key = f"uploads/{unique_id}/{safe_name}"

    content_type = request.content_type
    if not content_type or content_type == "application/octet-stream":
        ext, _ = detect_category(safe_name)
        content_type = get_content_type(ext)

    storage = get_storage_provider()
    try:
        data = storage.generate_presigned_upload_url(
            key=storage_key,
            content_type=content_type,
            expires_in=3600
        )
        return PresignedUrlResponse(
            upload_url=data["upload_url"],
            key=storage_key,
            filename=safe_name,
            expires_in_seconds=3600,
            headers=data.get("headers", {}),
            is_direct_upload=True
        )
    except Exception as e:
        logger.error(f"Échec de génération d'URL présignée: {e}")
        raise HTTPException(status_code=500, detail="Impossible de générer l'URL de téléversement.")

@router.post("/upload-direct")
async def upload_direct_fallback(
    file: UploadFile = File(...),
    key: str = Query(None)
):
    """
    Endpoint de secours pour téléversement direct côté serveur si le client
    ne peut pas contacter directement le stockage objet S3/MinIO.
    """
    safe_name = sanitize_filename(file.filename or "uploaded_file")
    if not key:
        unique_id = str(uuid.uuid4())
        key = f"uploads/{unique_id}/{safe_name}"

    storage = get_storage_provider()
    try:
        content = await file.read()
        saved_key = await storage.upload_file(content, key, file.content_type or "application/octet-stream")
        return {
            "key": saved_key,
            "filename": safe_name,
            "size_bytes": len(content),
            "status": "UPLOADED"
        }
    except Exception as e:
        logger.error(f"Erreur lors de l'upload direct: {e}")
        raise HTTPException(status_code=500, detail=str(e))
