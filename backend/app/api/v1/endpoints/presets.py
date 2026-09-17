from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter()

PRESETS_DATA = [
    {
        "category": "video",
        "title": "Vidéo",
        "description": "Transcodage haute performance, extraction audio, compression et GIF animé",
        "icon": "Video",
        "source_extensions": ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"],
        "target_formats": [
            {"id": "mp4", "label": "MP4 (H.264/AAC)", "description": "Compatibilité universelle maximale", "popular": True},
            {"id": "mp3", "label": "MP3 (Audio)", "description": "Extrait uniquement la piste sonore en haute qualité", "popular": True},
            {"id": "webm", "label": "WebM (VP9)", "description": "Format optimisé pour le streaming web moderne", "popular": False},
            {"id": "gif", "label": "GIF Animé", "description": "Convertit un court extrait vidéo en GIF boucle", "popular": True},
            {"id": "mkv", "label": "MKV (Matroska)", "description": "Conteneur complet multi-pistes", "popular": False},
            {"id": "wav", "label": "WAV (Lossless)", "description": "Audio non compressé sans perte de qualité", "popular": False},
        ],
        "options_schema": [
            {"id": "quality", "label": "Qualité d'encodage", "type": "select", "options": ["high", "medium", "low"], "default": "high"},
            {"id": "resolution", "label": "Résolution", "type": "select", "options": ["original", "1080p", "720p", "480p"], "default": "original"},
            {"id": "audio_bitrate", "label": "Débit Audio (kbps)", "type": "select", "options": ["320k", "192k", "128k"], "default": "192k"}
        ]
    },
    {
        "category": "audio",
        "title": "Audio",
        "description": "Conversion de codecs, compression et normalisation sonore",
        "icon": "Music",
        "source_extensions": ["mp3", "wav", "aac", "flac", "ogg", "m4a", "wma"],
        "target_formats": [
            {"id": "mp3", "label": "MP3", "description": "Idéal pour tous lecteurs et smartphones", "popular": True},
            {"id": "wav", "label": "WAV", "description": "Qualité master studio PCM 16/24-bit", "popular": True},
            {"id": "flac", "label": "FLAC", "description": "Compression audio sans aucune perte (Lossless)", "popular": True},
            {"id": "ogg", "label": "OGG Vorbis", "description": "Standard ouvert léger", "popular": False},
            {"id": "aac", "label": "AAC / M4A", "description": "Qualité optimale à bas débit", "popular": False},
        ],
        "options_schema": [
            {"id": "bitrate", "label": "Débit binaire", "type": "select", "options": ["320k", "256k", "192k", "128k"], "default": "320k"},
            {"id": "channels", "label": "Canaux", "type": "select", "options": ["original", "stereo", "mono"], "default": "original"}
        ]
    },
    {
        "category": "image",
        "title": "Images",
        "description": "Optimisation WebP/AVIF, redimensionnement et conversion de formats",
        "icon": "Image",
        "source_extensions": ["png", "jpg", "jpeg", "webp", "avif", "gif", "svg", "bmp", "tiff", "ico"],
        "target_formats": [
            {"id": "webp", "label": "WebP Moderne", "description": "Réduction de 30% à 70% du poids sans perte visible", "popular": True},
            {"id": "avif", "label": "AVIF Haute Densité", "description": "Dernier standard ultra-compressé du W3C", "popular": True},
            {"id": "png", "label": "PNG", "description": "Transparence alpha et compression sans perte", "popular": True},
            {"id": "jpg", "label": "JPEG", "description": "Photographie standard", "popular": False},
            {"id": "ico", "label": "ICO Favicon", "description": "Icône pour sites web (16x16, 32x32)", "popular": False},
            {"id": "pdf", "label": "PDF Image", "description": "Intègre l'image dans une page PDF", "popular": False},
        ],
        "options_schema": [
            {"id": "quality", "label": "Qualité (1-100)", "type": "number", "min": 10, "max": 100, "default": 85},
            {"id": "max_width", "label": "Largeur max (px)", "type": "number", "default": 1920},
            {"id": "preserve_transparency", "label": "Préserver la transparence", "type": "boolean", "default": True}
        ]
    },
    {
        "category": "document",
        "title": "Documents",
        "description": "Conversion de documents riches, Markdown, PDF, Word et HTML",
        "icon": "FileText",
        "source_extensions": ["pdf", "docx", "doc", "txt", "md", "html", "epub", "csv", "xlsx"],
        "target_formats": [
            {"id": "pdf", "label": "PDF Document", "description": "Mise en page vectorielle universelle", "popular": True},
            {"id": "docx", "label": "Microsoft Word (DOCX)", "description": "Document éditable sous Word", "popular": True},
            {"id": "md", "label": "Markdown", "description": "Format texte brut structuré pour développeurs", "popular": True},
            {"id": "html", "label": "HTML5 Web", "description": "Page web prête à intégrer avec styles", "popular": False},
            {"id": "txt", "label": "Texte Brut (TXT)", "description": "Extrait le contenu textuel pur", "popular": False},
        ],
        "options_schema": [
            {"id": "include_toc", "label": "Table des matières automatique", "type": "boolean", "default": False},
            {"id": "page_size", "label": "Format de page", "type": "select", "options": ["A4", "Letter"], "default": "A4"}
        ]
    },
    {
        "category": "code",
        "title": "Code & Transpilation",
        "description": "Traduction sémantique inter-langages par IA & conversion de formats de données",
        "icon": "Code",
        "source_extensions": ["py", "js", "ts", "jsx", "tsx", "cpp", "c", "rs", "go", "java", "cs", "json", "yaml", "yml", "toml", "sql"],
        "target_formats": [
            {"id": "ts", "label": "TypeScript", "description": "Typage statique moderne", "popular": True},
            {"id": "py", "label": "Python", "description": "Syntaxe claire et expressive", "popular": True},
            {"id": "cpp", "label": "C++ 20", "description": "Performance native compilée", "popular": True},
            {"id": "rs", "label": "Rust", "description": "Sécurité mémoire et haute vitesse", "popular": True},
            {"id": "go", "label": "Go (Golang)", "description": "Concurrence légère et microservices", "popular": False},
            {"id": "js", "label": "JavaScript (ES6+)", "description": "Exécution web et Node.js", "popular": False},
            {"id": "json", "label": "JSON Formatté", "description": "Format d'échange standard", "popular": True},
            {"id": "yaml", "label": "YAML", "description": "Configuration humaine claire", "popular": True},
            {"id": "toml", "label": "TOML", "description": "Format de configuration moderne", "popular": False},
        ],
        "options_schema": [
            {"id": "ai_translation", "label": "Traduction sémantique par IA", "type": "boolean", "default": True},
            {"id": "include_comments", "label": "Commentaires explicatifs", "type": "boolean", "default": True},
            {"id": "target_runtime", "label": "Cible d'exécution", "type": "text", "default": "Modern standard"}
        ]
    }
]

@router.get("", response_model=List[Dict[str, Any]])
async def get_conversion_presets():
    """Renvoie toutes les catégories et leurs configurations de formats"""
    return PRESETS_DATA
