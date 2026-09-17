from app.storage.base import StorageProvider
from app.storage.s3 import S3StorageProvider
from app.storage.local import LocalStorageProvider
from app.config import settings
import logging

logger = logging.getLogger(__name__)

_storage_instance = None

def get_storage_provider() -> StorageProvider:
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    # Si S3 / MinIO est configuré, on tente de l'utiliser
    try:
        if settings.S3_ENDPOINT_URL or settings.S3_ACCESS_KEY:
            logger.info("Utilisation du fournisseur de stockage S3 / MinIO.")
            _storage_instance = S3StorageProvider()
            return _storage_instance
    except Exception as e:
        logger.warning(f"Impossible d'initialiser S3/MinIO ({e}). Bascule vers LocalStorage.")

    logger.info("Utilisation du fournisseur de stockage Local.")
    _storage_instance = LocalStorageProvider()
    return _storage_instance

__all__ = ["StorageProvider", "S3StorageProvider", "LocalStorageProvider", "get_storage_provider"]
