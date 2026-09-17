import boto3
from botocore.config import Config
from typing import Dict, Any, Optional
import os
import aiofiles
from app.config import settings
from app.storage.base import StorageProvider
import logging

logger = logging.getLogger(__name__)

class S3StorageProvider(StorageProvider):
    def __init__(self):
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.public_endpoint_url = settings.S3_PUBLIC_ENDPOINT_URL
        self.access_key = settings.S3_ACCESS_KEY
        self.secret_key = settings.S3_SECRET_KEY
        self.bucket_name = settings.STORAGE_BUCKET_NAME
        self.region_name = settings.S3_REGION_NAME

        # Configuration Boto3 pour signature v4 et compatible MinIO/S3
        self.client_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"}
        )

        self._s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name,
            config=self.client_config
        )

    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """Génère une URL PUT présignée pour l'upload direct"""
        try:
            url = self._s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires_in,
                HttpMethod="PUT"
            )
            
            # Si le client utilise une URL publique différente de l'URL interne docker
            if self.public_endpoint_url and self.endpoint_url != self.public_endpoint_url:
                url = url.replace(self.endpoint_url, self.public_endpoint_url)

            return {
                "upload_url": url,
                "key": key,
                "headers": {"Content-Type": content_type}
            }
        except Exception as e:
            logger.error(f"Erreur lors de la génération de l'URL présignée: {e}")
            raise

    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600,
        filename: Optional[str] = None
    ) -> str:
        """Génère une URL GET présignée pour le téléchargement"""
        try:
            params = {
                "Bucket": self.bucket_name,
                "Key": key,
            }
            if filename:
                params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

            url = self._s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params=params,
                ExpiresIn=expires_in,
                HttpMethod="GET"
            )

            if self.public_endpoint_url and self.endpoint_url != self.public_endpoint_url:
                url = url.replace(self.endpoint_url, self.public_endpoint_url)

            return url
        except Exception as e:
            logger.error(f"Erreur téléchargement URL présignée: {e}")
            return f"{self.public_endpoint_url}/{self.bucket_name}/{key}"

    async def upload_file(self, file_data: bytes, key: str, content_type: str) -> str:
        self._s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type
        )
        return key

    async def download_file_to_path(self, key: str, target_path: str) -> str:
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        self._s3_client.download_file(self.bucket_name, key, target_path)
        return target_path

    async def upload_from_path(self, local_path: str, key: str, content_type: str) -> str:
        self._s3_client.upload_file(
            local_path,
            self.bucket_name,
            key,
            ExtraArgs={"ContentType": content_type}
        )
        return key

    async def delete_file(self, key: str) -> bool:
        try:
            self._s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception as e:
            logger.warning(f"Erreur lors de la suppression de {key}: {e}")
            return False
