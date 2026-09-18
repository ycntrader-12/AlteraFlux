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
        "title": "Documents texte",
        "description": "Microsoft Word, OpenDocument, LaTeX, Markdown, RTF et HTML",
        "icon": "FileText",
        "source_extensions": ["doc", "docx", "docm", "dot", "dotx", "dotm", "odt", "ott", "rtf", "txt", "md", "tex", "latex", "xml", "html", "htm"],
        "target_formats": [
            {"id": "docx", "label": "Microsoft Word (.docx)", "description": "Document bureautique standard", "popular": True},
            {"id": "doc", "label": "Word Ancien (.doc)", "description": "Word 97-2003 rétrocompatible", "popular": False},
            {"id": "odt", "label": "OpenDocument Text (.odt)", "description": "Format libre standardisé", "popular": True},
            {"id": "rtf", "label": "Rich Text Format (.rtf)", "description": "Texte enrichi multi-plateforme", "popular": False},
            {"id": "txt", "label": "Texte Brut (.txt)", "description": "Texte sans mise en forme", "popular": True},
            {"id": "md", "label": "Markdown (.md)", "description": "Balisage léger pour développeurs", "popular": True},
            {"id": "html", "label": "HTML (.html)", "description": "Page web prête à intégrer", "popular": False},
            {"id": "tex", "label": "LaTeX (.tex)", "description": "Composition scientifique et mathématique", "popular": False},
            {"id": "xml", "label": "XML (.xml)", "description": "Balisage hiérarchique structuré", "popular": False},
            {"id": "pdf", "label": "PDF Document", "description": "Export PDF direct", "popular": True}
        ],
        "options_schema": [
            {"id": "include_toc", "label": "Table des matières automatique", "type": "boolean", "default": False},
            {"id": "page_size", "label": "Format de page", "type": "select", "options": ["A4", "Letter"], "default": "A4"}
        ]
    },
    {
        "category": "pdf",
        "title": "PDF et formats associés",
        "description": "Portable Document Format, PDF/A, XML Paper Specification et XPS",
        "icon": "BookOpen",
        "source_extensions": ["pdf", "xps", "oxps", "pdfa"],
        "target_formats": [
            {"id": "pdf", "label": "PDF Standard (.pdf)", "description": "Portable Document Format universel", "popular": True},
            {"id": "pdfa", "label": "PDF/A Archivage (.pdfa)", "description": "Conforme aux normes d'archivage pérenne", "popular": True},
            {"id": "docx", "label": "Word Éditable (.docx)", "description": "Extraction et conversion en document Word", "popular": True},
            {"id": "xps", "label": "XML Paper Specification (.xps)", "description": "Format d'impression Microsoft", "popular": False},
            {"id": "oxps", "label": "OpenXPS (.oxps)", "description": "Standard ouvert XPS", "popular": False},
            {"id": "txt", "label": "Texte Brut (.txt)", "description": "Extraction textuelle brute", "popular": False}
        ],
        "options_schema": [
            {"id": "ocr", "label": "Reconnaissance OCR", "type": "boolean", "default": False},
            {"id": "pdf_version", "label": "Version PDF", "type": "select", "options": ["1.4", "1.7", "A-1b"], "default": "1.7"}
        ]
    },
    {
        "category": "spreadsheet",
        "title": "Feuilles de calcul",
        "description": "Excel, OpenDocument Spreadsheet, CSV et données tabulaires",
        "icon": "Table",
        "source_extensions": ["xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm", "ods", "ots", "csv", "tsv"],
        "target_formats": [
            {"id": "xlsx", "label": "Excel Moderne (.xlsx)", "description": "Classeur Microsoft Excel XML", "popular": True},
            {"id": "xls", "label": "Excel Ancien (.xls)", "description": "Classeur Excel 97-2003", "popular": False},
            {"id": "ods", "label": "OpenDocument (.ods)", "description": "Feuille de calcul libre LibreOffice", "popular": True},
            {"id": "csv", "label": "CSV Délimité (.csv)", "description": "Valeurs séparées par virgules", "popular": True},
            {"id": "tsv", "label": "TSV (.tsv)", "description": "Valeurs séparées par tabulations", "popular": False},
            {"id": "pdf", "label": "PDF Tableur (.pdf)", "description": "Rendu tableau prêt à l'impression", "popular": True},
            {"id": "json", "label": "Données JSON (.json)", "description": "Export lignes vers objets JSON", "popular": False}
        ],
        "options_schema": [
            {"id": "delimiter", "label": "Délimiteur CSV", "type": "select", "options": [",", ";", "\\t"], "default": ","},
            {"id": "has_headers", "label": "Première ligne comme en-têtes", "type": "boolean", "default": True}
        ]
    },
    {
        "category": "presentation",
        "title": "Présentations",
        "description": "PowerPoint, OpenDocument Presentation et diaporamas",
        "icon": "Presentation",
        "source_extensions": ["ppt", "pptx", "pptm", "pps", "ppsx", "ppsm", "pot", "potx", "potm", "odp", "otp"],
        "target_formats": [
            {"id": "pptx", "label": "PowerPoint (.pptx)", "description": "Présentation moderne Microsoft PowerPoint", "popular": True},
            {"id": "ppt", "label": "PowerPoint Ancien (.ppt)", "description": "Présentation PowerPoint 97-2003", "popular": False},
            {"id": "odp", "label": "OpenDocument (.odp)", "description": "Présentation libre LibreOffice Impress", "popular": True},
            {"id": "pdf", "label": "Diaporama PDF (.pdf)", "description": "Export diapositives vers PDF vectoriel", "popular": True},
            {"id": "ppsx", "label": "PowerPoint Show (.ppsx)", "description": "Diaporama à exécution immédiate", "popular": False}
        ],
        "options_schema": [
            {"id": "slides_per_page", "label": "Diapositives par page (si PDF)", "type": "select", "options": ["1", "2", "4", "6"], "default": "1"}
        ]
    },
    {
        "category": "database",
        "title": "Bases de données & Structurés",
        "description": "Microsoft Access, SQLite, tables relationnelles, JSON, YAML",
        "icon": "Database",
        "source_extensions": ["mdb", "accdb", "db", "sqlite", "sqlite3", "json", "yaml", "yml", "csv"],
        "target_formats": [
            {"id": "sqlite", "label": "SQLite 3 (.sqlite)", "description": "Base relationnelle autonome embarquée", "popular": True},
            {"id": "csv", "label": "Export CSV (.csv)", "description": "Tables exportées en fichiers délimités", "popular": True},
            {"id": "json", "label": "JSON Structuré (.json)", "description": "Données hiérarchiques JavaScript", "popular": True},
            {"id": "yaml", "label": "YAML (.yaml)", "description": "Structure lisible par l'humain", "popular": False},
            {"id": "sql", "label": "Dump SQL (.sql)", "description": "Script de création de schéma et données", "popular": True}
        ],
        "options_schema": [
            {"id": "pretty_print", "label": "Indentation et lisibilité (Pretty)", "type": "boolean", "default": True}
        ]
    },
    {
        "category": "ebook",
        "title": "Formats e-Book",
        "description": "ePub, Amazon Kindle (MOBI, AZW, AZW3), FictionBook et Comics (CBZ, CBR)",
        "icon": "Book",
        "source_extensions": ["epub", "mobi", "azw", "azw3", "fb2", "cbz", "cbr"],
        "target_formats": [
            {"id": "epub", "label": "ePub Universel (.epub)", "description": "Standard ouvert pour liseuses", "popular": True},
            {"id": "pdf", "label": "Livre PDF (.pdf)", "description": "Mise en page fixe pour ordinateurs/tablettes", "popular": True},
            {"id": "mobi", "label": "Mobipocket (.mobi)", "description": "Format pour liseuses Kindle historiques", "popular": True},
            {"id": "azw3", "label": "Kindle Format 8 (.azw3)", "description": "Format moderne pour liseuses Amazon", "popular": False},
            {"id": "txt", "label": "Texte Livre (.txt)", "description": "Contenu textuel pur sans images", "popular": False}
        ],
        "options_schema": [
            {"id": "font_size", "label": "Taille de police de base", "type": "select", "options": ["medium", "large", "small"], "default": "medium"}
        ]
    },
    {
        "category": "publishing",
        "title": "Impression & Publication (DTP)",
        "description": "PostScript, Encapsulated PostScript, Publisher, InDesign",
        "icon": "Printer",
        "source_extensions": ["ps", "eps", "pub", "pmd", "indd", "idml"],
        "target_formats": [
            {"id": "pdf", "label": "PDF Haute Définition (.pdf)", "description": "Export prêt pour l'impression professionnelle", "popular": True},
            {"id": "eps", "label": "Encapsulated PostScript (.eps)", "description": "Graphisme vectoriel de publication", "popular": True},
            {"id": "ps", "label": "PostScript (.ps)", "description": "Langage de description de page imprimante", "popular": False},
            {"id": "png", "label": "Rendu Raster HD (.png)", "description": "Aperçu image haute résolution 300 DPI", "popular": False}
        ],
        "options_schema": [
            {"id": "dpi", "label": "Résolution DPI", "type": "select", "options": ["300", "600", "150"], "default": "300"}
        ]
    },
    {
        "category": "technical",
        "title": "Documents techniques & CAO/DAO",
        "description": "AutoCAD (DWG, DXF), MicroStation (DGN), Microsoft Visio et SVG",
        "icon": "Layers",
        "source_extensions": ["dwg", "dxf", "dgn", "svg", "vsd", "vsdx", "vsdm"],
        "target_formats": [
            {"id": "pdf", "label": "Plan Vectoriel PDF (.pdf)", "description": "Export de plan à l'échelle pour impression", "popular": True},
            {"id": "svg", "label": "Vectoriel Web (.svg)", "description": "Tracé vectoriel XML interactif", "popular": True},
            {"id": "dxf", "label": "AutoCAD DXF (.dxf)", "description": "Drawing Exchange Format inter-logiciels", "popular": True},
            {"id": "png", "label": "Rendu Plan HD (.png)", "description": "Aperçu image bitmap haute résolution", "popular": False}
        ],
        "options_schema": [
            {"id": "color_mode", "label": "Mode couleur", "type": "select", "options": ["color", "monochrome"], "default": "color"}
        ]
    },
    {
        "category": "notes",
        "title": "Formats de Notes",
        "description": "Microsoft OneNote, Evernote Export et Outline OPML",
        "icon": "FileEdit",
        "source_extensions": ["one", "enex", "opml"],
        "target_formats": [
            {"id": "pdf", "label": "Notes PDF (.pdf)", "description": "Compilation de notes en livret PDF", "popular": True},
            {"id": "md", "label": "Markdown (.md)", "description": "Export compatible Obsidian / Notion / Logseq", "popular": True},
            {"id": "html", "label": "Notes HTML (.html)", "description": "Classeur web interactif avec liens", "popular": False},
            {"id": "docx", "label": "Word Document (.docx)", "description": "Rapport complet sous Word", "popular": False}
        ],
        "options_schema": [
            {"id": "include_attachments", "label": "Préserver pièces jointes", "type": "boolean", "default": True}
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
            {"id": "sql", "label": "SQL Schéma & Inserts", "description": "Requêtes d'insertion et DDL", "popular": False}
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

