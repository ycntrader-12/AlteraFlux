import re
import os
from typing import Tuple, Optional

# Table des catégories et extensions autorisées
ALLOWED_EXTENSIONS = {
    # Media: Vidéo
    "mp4": "video", "mkv": "video", "avi": "video", "mov": "video", "webm": "video", "flv": "video", "wmv": "video",
    # Media: Audio
    "mp3": "audio", "wav": "audio", "aac": "audio", "flac": "audio", "ogg": "audio", "m4a": "audio", "wma": "audio", "opus": "audio",
    # Documents texte
    "doc": "document", "docx": "document", "docm": "document", "dot": "document", "dotx": "document", "dotm": "document",
    "odt": "document", "ott": "document", "rtf": "document", "txt": "document", "md": "document",
    "tex": "document", "latex": "document", "xml": "document", "html": "document", "htm": "document",
    # PDF et formats associés
    "pdf": "document", "xps": "document", "oxps": "document", "pdfa": "document",
    # Feuilles de calcul
    "xls": "document", "xlsx": "document", "xlsm": "document", "xlsb": "document",
    "xlt": "document", "xltx": "document", "xltm": "document", "ods": "document", "ots": "document",
    "csv": "document", "tsv": "document",
    # Présentations
    "ppt": "document", "pptx": "document", "pptm": "document", "pps": "document",
    "ppsx": "document", "ppsm": "document", "pot": "document", "potx": "document",
    "potm": "document", "odp": "document", "otp": "document",
    # Bases de données / documents structurés
    "mdb": "document", "accdb": "document", "db": "document", "sqlite": "document", "sqlite3": "document",
    # E-books
    "epub": "document", "mobi": "document", "azw": "document", "azw3": "document",
    "fb2": "document", "cbz": "document", "cbr": "document",
    # Impression / Publication
    "ps": "document", "eps": "document", "pub": "document", "pmd": "document", "indd": "document", "idml": "document",
    # Documents techniques / CAD
    "dwg": "document", "dxf": "document", "dgn": "document", "vsd": "document", "vsdx": "document", "vsdm": "document",
    # Notes
    "one": "document", "enex": "document", "opml": "document",
    # Images
    "png": "image", "jpg": "image", "jpeg": "image", "webp": "image", "avif": "image",
    "gif": "image", "svg": "image", "ico": "image", "bmp": "image", "tiff": "image",
    # Code
    "py": "code", "js": "code", "ts": "code", "jsx": "code", "tsx": "code", "cpp": "code",
    "c": "code", "rs": "code", "go": "code", "java": "code", "cs": "code", "json": "code",
    "yaml": "code", "yml": "code", "toml": "code", "sql": "code"
}

# Liste noire stricte de formats exécutables ou dangereux pour l'intégrité du serveur
DANGEROUS_EXTENSIONS = {
    "exe", "bat", "cmd", "sh", "bash", "php", "phtml", "php3", "php4", "php5", "pht",
    "vbs", "ps1", "com", "msi", "scr", "dll", "so", "bin", "jar", "cgi", "pl", "app",
    "action", "apk", "vbe", "wsf", "wsh", "jsp", "asp", "aspx"
}

# Table de correspondance MIME
MIME_TYPES = {
    # Vidéo
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mkv": "video/x-matroska",
    "avi": "video/x-msvideo",
    "mov": "video/quicktime",
    "flv": "video/x-flv",
    "wmv": "video/x-ms-wmv",
    # Audio
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "m4a": "audio/mp4",
    "opus": "audio/opus",
    "wma": "audio/x-ms-wma",
    # Image
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "avif": "image/avif",
    "gif": "image/gif",
    "svg": "image/svg+xml",
    "ico": "image/x-icon",
    "bmp": "image/bmp",
    "tiff": "image/tiff",
    # Documents texte & bureautique
    "pdf": "application/pdf",
    "pdfa": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "odt": "application/vnd.oasis.opendocument.text",
    "rtf": "application/rtf",
    "txt": "text/plain",
    "md": "text/markdown",
    "tex": "application/x-tex",
    "html": "text/html",
    "htm": "text/html",
    "xml": "application/xml",
    # Feuilles de calcul
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "csv": "text/csv",
    "tsv": "text/tab-separated-values",
    # Présentations
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "ppt": "application/vnd.ms-powerpoint",
    "odp": "application/vnd.oasis.opendocument.presentation",
    # E-books
    "epub": "application/epub+zip",
    "mobi": "application/x-mobipocket-ebook",
    # Base de données & Données
    "json": "application/json",
    "yaml": "text/yaml",
    "yml": "text/yaml",
    "toml": "application/toml",
    "sql": "application/sql",
    "sqlite": "application/x-sqlite3",
    "sqlite3": "application/x-sqlite3",
    "db": "application/octet-stream",
}


def sanitize_filename(filename: str) -> str:
    """
    Nettoie et valide rigoureusement le nom de fichier contre les cyberattaques :
    - Bloque l'injection de null bytes (\0, %00)
    - Bloque les attaques par Directory Traversal / Path Traversal (../, ..\)
    - Bloque les extensions exécutables et scripts malveillants (DANGEROUS_EXTENSIONS)
    - Détecte les techniques d'évasion par double extension (ex: shell.php.mp4)
    - Restreint strictement aux caractères sûrs [a-zA-Z0-9_.-]
    """
    if not filename:
        return "file.bin"

    # 1. Détection et blocage des null bytes (LFI / Bypass)
    if "\x00" in filename or "%00" in filename:
        raise ValueError("Tentative d'injection détectée (null byte).")

    # 2. Suppression de tout chemin relatif ou absolu
    base_name = os.path.basename(filename).replace("\\", "/").split("/")[-1]
    
    # 3. Nettoyage des séquences de traversal résiduelles
    base_name = base_name.replace("..", "").strip()

    # 4. Vérification des extensions et détection de double extension malveillante
    parts = base_name.split(".")
    for part in parts[1:]:
        ext_lower = part.lower().strip()
        if ext_lower in DANGEROUS_EXTENSIONS:
            raise ValueError(f"Fichier refusé pour des raisons de sécurité (extension non autorisée: .{ext_lower}).")

    # 5. Filtrage des caractères pour autoriser uniquement les caractères sûrs
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', base_name)
    
    # Éviter les points multiples consécutifs ou commençant par un point
    clean_name = re.sub(r'\.{2,}', '.', clean_name).lstrip(".")

    # 6. Limitation stricte de longueur pour prévenir les attaques par dépassement de buffer
    if len(clean_name) > 120:
        name_parts = clean_name.rsplit(".", 1)
        if len(name_parts) == 2:
            clean_name = name_parts[0][:110] + "." + name_parts[1]
        else:
            clean_name = clean_name[:120]

    if not clean_name:
        clean_name = "file.bin"

    return clean_name

def detect_category(filename: str) -> Tuple[str, str]:
    """Retourne l'extension normalisée et la catégorie (video, audio, document, image, code)"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in DANGEROUS_EXTENSIONS:
        return ext, "forbidden"
    category = ALLOWED_EXTENSIONS.get(ext, "unknown")
    return ext, category

def get_content_type(extension: str) -> str:
    return MIME_TYPES.get(extension.lower(), "application/octet-stream")
