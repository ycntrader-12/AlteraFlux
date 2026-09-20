import socket
import logging
from urllib.parse import urlparse
from app.storage.base import StorageProvider
from app.storage.s3 import S3StorageProvider
from app.storage.local import LocalStorageProvider
from app.config import settings

logger = logging.getLogger(__name__)

_storage_instance = None

def _is_s3_available(endpoint_url: str) -> bool:
    if not endpoint_url:
        return False
    try:
        parsed = urlparse(endpoint_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.6)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False

def get_storage_provider() -> StorageProvider:
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    # Si S3 / MinIO est configuré ET accessible, on l'utilise
    try:
        if (settings.S3_ENDPOINT_URL or settings.S3_ACCESS_KEY) and _is_s3_available(settings.S3_ENDPOINT_URL):
            logger.info("Fournisseur de stockage S3 / MinIO détecté et actif.")
            _storage_instance = S3StorageProvider()
            return _storage_instance
        else:
            logger.info("MinIO/S3 non actif sur %s. Bascule automatique vers LocalStorage.", settings.S3_ENDPOINT_URL)
    except Exception as e:
        logger.warning(f"Impossible d'initialiser S3/MinIO ({e}). Bascule vers LocalStorage.")

    logger.info("Utilisation du fournisseur de stockage Local.")
    _storage_instance = LocalStorageProvider()
    return _storage_instance

__all__ = ["StorageProvider", "S3StorageProvider", "LocalStorageProvider", "get_storage_provider"]
