from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class StorageProvider(ABC):
    @abstractmethod
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Génère une URL présignée pour l'upload direct depuis le client"""
        pass

    @abstractmethod
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """Génère une URL de téléchargement sécurisée"""
        pass

    @abstractmethod
    async def upload_file(self, file_data: bytes, key: str, content_type: str) -> str:
        """Upload direct côté serveur"""
        pass

    @abstractmethod
    async def download_file_to_path(self, key: str, target_path: str) -> str:
        """Télécharge un objet de stockage vers un chemin local"""
        pass

    @abstractmethod
    async def upload_from_path(self, local_path: str, key: str, content_type: str) -> str:
        """Upload un fichier local vers le stockage"""
        pass

    @abstractmethod
    async def delete_file(self, key: str) -> bool:
        """Supprime un fichier stocké"""
        pass
