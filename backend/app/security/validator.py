import re
import os
from typing import Tuple, Optional

# Table des catégories et extensions autorisées
ALLOWED_EXTENSIONS = {
    # Media: Vidéo
    "mp4": "video", "mkv": "video", "avi": "video", "mov": "video", "webm": "video", "flv": "video", "wmv": "video",
    # Media: Audio
    "mp3": "audio", "wav": "audio", "aac": "audio", "flac": "audio", "ogg": "audio", "m4a": "audio", "wma": "audio",
    # Documents
    "pdf": "document", "docx": "document", "doc": "document", "txt": "document", "md": "document",
    "html": "document", "htm": "document", "epub": "document", "rtf": "document", "odt": "document",
    "csv": "document", "xlsx": "document",
    # Images
    "png": "image", "jpg": "image", "jpeg": "image", "webp": "image", "avif": "image",
    "gif": "image", "svg": "image", "ico": "image", "bmp": "image", "tiff": "image",
    # Code
    "py": "code", "js": "code", "ts": "code", "jsx": "code", "tsx": "code", "cpp": "code",
    "c": "code", "rs": "code", "go": "code", "java": "code", "cs": "code", "json": "code",
    "yaml": "code", "yml": "code", "toml": "code", "xml": "code", "sql": "code", "sh": "code"
}

# Table de correspondance MIME
MIME_TYPES = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "json": "application/json",
    "txt": "text/plain",
    "md": "text/markdown",
}

def sanitize_filename(filename: str) -> str:
    """Nettoie le nom de fichier pour éviter les attaques par injection ou traversée de répertoires"""
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_name)
    if not clean_name:
        clean_name = "file"
    return clean_name

def detect_category(filename: str) -> Tuple[str, str]:
    """Retourne l'extension normalisée et la catégorie (video, audio, document, image, code)"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    category = ALLOWED_EXTENSIONS.get(ext, "unknown")
    return ext, category

def get_content_type(extension: str) -> str:
    return MIME_TYPES.get(extension.lower(), "application/octet-stream")
