import os
import aiofiles
from typing import Dict, Any, Optional
from app.config import settings
from app.storage.base import StorageProvider
import logging

logger = logging.getLogger(__name__)

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: Optional[str] = None):
        self.base_path = base_path or settings.LOCAL_STORAGE_PATH
        os.makedirs(self.base_path, exist_ok=True)

    def _get_abs_path(self, key: str) -> str:
        # Assainissement de la clé pour éviter directory traversal
        safe_key = os.path.normpath(key).lstrip("/\\")
        return os.path.join(self.base_path, safe_key)

    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Pour le stockage local, l'URL pointe vers l'endpoint direct du backend"""
        return {
            "upload_url": f"/api/v1/storage/upload-direct?key={key}",
            "key": key,
            "headers": {"Content-Type": content_type}
        }

    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        url = f"/api/v1/storage/download?key={key}"
        if filename:
            url += f"&filename={filename}"
        return url

    async def upload_file(self, file_data: bytes, key: str, content_type: str) -> str:
        abs_path = self._get_abs_path(key)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        async with aiofiles.open(abs_path, "wb") as f:
            await f.write(file_data)
        return key

    async def download_file_to_path(self, key: str, target_path: str) -> str:
        abs_path = self._get_abs_path(key)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Fichier {key} introuvable.")
        
        async with aiofiles.open(abs_path, "rb") as src, aiofiles.open(target_path, "wb") as dst:
            content = await src.read()
            await dst.write(content)
        return target_path

    async def upload_from_path(self, local_path: str, key: str, content_type: str) -> str:
        abs_path = self._get_abs_path(key)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        async with aiofiles.open(local_path, "rb") as src, aiofiles.open(abs_path, "wb") as dst:
            content = await src.read()
            await dst.write(content)
        return key

    async def delete_file(self, key: str) -> bool:
        abs_path = self._get_abs_path(key)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
                return True
            except Exception as e:
                logger.warning(f"Erreur suppression {abs_path}: {e}")
                return False
        return False
