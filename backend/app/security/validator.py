import re
import os
import json
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
    # Archives & Compression
    "zip": "archive", "tar": "archive", "gz": "archive", "tgz": "archive",
    "bz2": "archive", "tbz2": "archive", "7z": "archive", "rar": "archive",
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
    # Archives & Compression
    "zip": "application/zip",
    "tar": "application/x-tar",
    "gz": "application/gzip",
    "tgz": "application/gzip",
    "bz2": "application/x-bzip2",
    "tbz2": "application/x-bzip2",
    "7z": "application/x-7z-compressed",
    "rar": "application/vnd.rar",
}

# -------------------------------------------------------------
# Matrice de compatibilité de conversion (Source -> Cibles autorisées)
# -------------------------------------------------------------
_VIDEO_TARGETS = {"mp4", "webm", "mkv", "mov", "avi", "gif", "mp3", "wav", "aac", "flac", "ogg"}
_AUDIO_TARGETS = {"mp3", "wav", "flac", "ogg", "aac", "m4a", "opus"}
_IMAGE_TARGETS = {"png", "jpg", "jpeg", "webp", "avif", "gif", "ico", "bmp", "tiff", "pdf"}
_DOC_TARGETS = {"pdf", "docx", "doc", "odt", "rtf", "txt", "md", "html"}
_PDF_TARGETS = {"docx", "doc", "txt", "md", "html", "png", "jpg", "jpeg", "webp", "pdf", "pdfa"}
_SHEET_TARGETS = {"xlsx", "xls", "ods", "csv", "tsv", "json", "html", "pdf"}
_PRESENTATION_TARGETS = {"pptx", "odp", "pdf", "txt", "html"}
_DATA_CONFIG_TARGETS = {"json", "yaml", "yml", "toml", "sql", "csv"}
_CODE_TARGETS = {"ts", "js", "py", "cpp", "rs", "go"}
_ARCHIVE_TARGETS = {"zip", "tar", "tar.gz", "tar.bz2", "tgz", "tbz2"}
_DATABASE_TARGETS = {"csv", "xlsx", "json", "html", "sql", "sqlite", "sqlite3"}

COMPATIBILITY_MAP = {
    # Vidéo
    "mp4": _VIDEO_TARGETS, "mkv": _VIDEO_TARGETS, "avi": _VIDEO_TARGETS,
    "mov": _VIDEO_TARGETS, "webm": _VIDEO_TARGETS, "flv": _VIDEO_TARGETS, "wmv": _VIDEO_TARGETS,
    # Audio
    "mp3": _AUDIO_TARGETS, "wav": _AUDIO_TARGETS, "flac": _AUDIO_TARGETS,
    "aac": _AUDIO_TARGETS, "ogg": _AUDIO_TARGETS, "m4a": _AUDIO_TARGETS,
    "opus": _AUDIO_TARGETS, "wma": _AUDIO_TARGETS,
    # Images
    "png": _IMAGE_TARGETS, "jpg": _IMAGE_TARGETS, "jpeg": _IMAGE_TARGETS,
    "webp": _IMAGE_TARGETS, "avif": _IMAGE_TARGETS, "gif": _IMAGE_TARGETS,
    "svg": _IMAGE_TARGETS, "ico": _IMAGE_TARGETS, "bmp": _IMAGE_TARGETS, "tiff": _IMAGE_TARGETS,
    # Documents
    "doc": _DOC_TARGETS, "docx": _DOC_TARGETS, "docm": _DOC_TARGETS, "dot": _DOC_TARGETS,
    "dotx": _DOC_TARGETS, "odt": _DOC_TARGETS, "rtf": _DOC_TARGETS, "txt": _DOC_TARGETS,
    "md": _DOC_TARGETS, "tex": _DOC_TARGETS, "latex": _DOC_TARGETS, "html": _DOC_TARGETS,
    "htm": _DOC_TARGETS, "xml": _DOC_TARGETS, "epub": _DOC_TARGETS,
    # PDF
    "pdf": _PDF_TARGETS, "pdfa": _PDF_TARGETS, "xps": _PDF_TARGETS, "oxps": _PDF_TARGETS,
    # Tableurs
    "xls": _SHEET_TARGETS, "xlsx": _SHEET_TARGETS, "xlsm": _SHEET_TARGETS, "xlsb": _SHEET_TARGETS,
    "ods": _SHEET_TARGETS, "csv": _SHEET_TARGETS, "tsv": _SHEET_TARGETS,
    # Présentations
    "ppt": _PRESENTATION_TARGETS, "pptx": _PRESENTATION_TARGETS, "pptm": _PRESENTATION_TARGETS,
    "pps": _PRESENTATION_TARGETS, "ppsx": _PRESENTATION_TARGETS, "odp": _PRESENTATION_TARGETS,
    # Données et configuration
    "json": _DATA_CONFIG_TARGETS, "yaml": _DATA_CONFIG_TARGETS, "yml": _DATA_CONFIG_TARGETS,
    "toml": _DATA_CONFIG_TARGETS, "sql": _DATA_CONFIG_TARGETS,
    # Code source
    "py": _CODE_TARGETS, "js": _CODE_TARGETS, "ts": _CODE_TARGETS,
    "jsx": _CODE_TARGETS, "tsx": _CODE_TARGETS, "cpp": _CODE_TARGETS,
    "c": _CODE_TARGETS, "rs": _CODE_TARGETS, "go": _CODE_TARGETS,
    # Archives
    "zip": _ARCHIVE_TARGETS, "tar": _ARCHIVE_TARGETS, "gz": _ARCHIVE_TARGETS,
    "tgz": _ARCHIVE_TARGETS, "bz2": _ARCHIVE_TARGETS, "tbz2": _ARCHIVE_TARGETS,
    "7z": _ARCHIVE_TARGETS, "rar": _ARCHIVE_TARGETS,
    # Bases de données
    "sqlite": _DATABASE_TARGETS, "sqlite3": _DATABASE_TARGETS, "db": _DATABASE_TARGETS,
    "mdb": _DATABASE_TARGETS, "accdb": _DATABASE_TARGETS
}


def is_conversion_compatible(source_format: str, target_format: str) -> Tuple[bool, Optional[str]]:
    """
    Vérifie rigoureusement si le format source peut être converti vers le format cible.
    Retourne (True, None) si compatible, ou (False, raison explicative).
    """
    src = (source_format or "").lower().lstrip(".")
    tgt = (target_format or "").lower().lstrip(".")

    if not src:
        return False, "Le format source est indéterminé."
    if not tgt:
        return False, "Le format cible est obligatoire."

    if src in DANGEROUS_EXTENSIONS or tgt in DANGEROUS_EXTENSIONS:
        return False, "L'extension est bloquée pour des raisons de sécurité."

    # Même format : opération de recompression / validation autorisée
    if src == tgt:
        return True, None

    targets = COMPATIBILITY_MAP.get(src)
    if targets and tgt in targets:
        return True, None

    # Tout fichier peut être archivé en ZIP ou TAR.GZ
    if tgt in ["zip", "tar", "tar.gz", "tgz"]:
        return True, None

    if targets:
        sugg = ", ".join(sorted(list(targets))[:7])
        return False, f"Impossible de convertir un fichier .{src.upper()} en .{tgt.upper()}. Formats compatibles suggérés : {sugg}."

    return False, f"Le format source .{src.upper()} n'est pas encore pris en charge pour conversion."


def get_compatible_targets(source_format: str) -> list[str]:
    """Retourne la liste des formats cibles compatibles pour un format source donné"""
    src = (source_format or "").lower().lstrip(".")
    targets = set(COMPATIBILITY_MAP.get(src, set()))
    targets.add("zip")
    targets.add("tar.gz")
    return sorted(list(targets))


def validate_file_integrity(file_path: str, expected_format: str) -> Tuple[bool, str]:
    """
    Contrôle strict de l'intégrité d'un fichier (entrée ou sortie) :
    - Vérifie l'existence et la taille non nulle.
    - Valide les signatures binaires (Magic Bytes) contre les corruptions.
    """
    if not os.path.exists(file_path):
        return False, "Le fichier n'existe pas sur le système de fichiers."

    size = os.path.getsize(file_path)
    if size == 0:
        return False, "Le fichier est totalement vide (0 octet)."

    fmt = (expected_format or "").lower().lstrip(".")

    try:
        with open(file_path, "rb") as f:
            header = f.read(512)
    except Exception as e:
        return False, f"Impossible de lire le fichier: {e}"

    if len(header) == 0:
        return False, "En-tête de fichier introuvable."

    # 1. PDF : doit commencer par %PDF-
    if fmt in ["pdf", "pdfa"]:
        if not header.startswith(b"%PDF-"):
            return False, "Signature binaire PDF invalide (en-tête %PDF- manquant)."

    # 2. PNG : doit commencer par \x89PNG\r\n\x1a\n
    elif fmt == "png":
        if not header.startswith(b"\x89PNG\r\n\x1a\n"):
            return False, "Signature binaire PNG invalide."

    # 3. JPEG : commence par \xff\xd8\xff
    elif fmt in ["jpg", "jpeg"]:
        if not header.startswith(b"\xff\xd8"):
            return False, "Signature binaire JPEG invalide."

    # 4. GIF : commence par GIF87a ou GIF89a
    elif fmt == "gif":
        if not (header.startswith(b"GIF87a") or header.startswith(b"GIF89a")):
            return False, "Signature binaire GIF invalide."

    # 5. WEBP : RIFF....WEBP
    elif fmt == "webp":
        if not (header.startswith(b"RIFF") and b"WEBP" in header[:16]):
            return False, "Signature binaire WebP invalide."

    # 6. ZIP et conteneurs OpenXML (DOCX, XLSX, PPTX) : PK\x03\x04 ou PK\x05\x06
    elif fmt in ["zip", "docx", "xlsx", "pptx", "odt", "ods", "odp", "epub"]:
        if not (header.startswith(b"PK\x03\x04") or header.startswith(b"PK\x05\x06")):
            return False, f"Signature d'archive/conteneur XML invalide pour .{fmt.upper()}."

    # 7. GZ / TGZ : \x1f\x8b
    elif fmt in ["gz", "tgz", "tar.gz"]:
        if not header.startswith(b"\x1f\x8b"):
            return False, "Signature d'archive GZIP invalide."

    # 8. BZ2 / TBZ2 : BZh
    elif fmt in ["bz2", "tbz2", "tar.bz2"]:
        if not header.startswith(b"BZh"):
            return False, "Signature d'archive BZIP2 invalide."

    # 9. JSON : syntaxe JSON valide
    elif fmt == "json":
        try:
            with open(file_path, "r", encoding="utf-8") as jf:
                json.load(jf)
        except Exception as je:
            return False, f"Fichier JSON syntaxiquement corrompu: {je}"

    return True, "Fichier valide et intègre."


def sanitize_filename(filename: str) -> str:
    r"""
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
    """Retourne l'extension normalisée et la catégorie (video, audio, document, image, code, archive)"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in DANGEROUS_EXTENSIONS:
        return ext, "forbidden"
    category = ALLOWED_EXTENSIONS.get(ext, "unknown")
    return ext, category

def get_content_type(extension: str) -> str:
    return MIME_TYPES.get(extension.lower(), "application/octet-stream")

