from workers.engines.base import BaseConversionEngine
from workers.engines.media_engine import MediaEngine
from workers.engines.image_engine import ImageEngine
from workers.engines.document_engine import DocumentEngine
from workers.engines.code_engine import CodeEngine
from workers.engines.archive_engine import ArchiveEngine

def get_engine_for_category(
    category: str = "",
    source_format: str = "",
    target_format: str = "",
    progress_callback=None
) -> BaseConversionEngine:
    cat = (category or "").lower().replace("é", "e").replace("è", "e").strip()
    src = (source_format or "").lower().lstrip(".")
    tgt = (target_format or "").lower().lstrip(".")

    archive_exts = {
        "zip", "tar", "gz", "tgz", "bz2", "tbz2", "7z", "rar", "tar.gz", "tar.bz2"
    }
    video_audio_exts = {
        "mp4", "mov", "avi", "webm", "mkv", "flv", "wmv", "gif",
        "mp3", "wav", "flac", "aac", "ogg", "m4a", "opus", "wma"
    }
    image_exts = {
        "png", "jpg", "jpeg", "webp", "avif", "svg", "ico", "bmp", "tiff", "heic", "heif"
    }
    code_exts = {
        "json", "yaml", "yml", "toml", "js", "ts", "py", "rs", "go", "cpp", "c", "sql"
    }

    if cat in ["archive", "archives"] or (src in archive_exts and tgt in archive_exts) or (tgt in archive_exts and src not in video_audio_exts and src not in image_exts and src not in code_exts):
        return ArchiveEngine(progress_callback)
    elif cat in ["video", "audio"] or src in video_audio_exts or tgt in video_audio_exts:
        return MediaEngine(progress_callback)
    elif cat in ["image", "images"] or (src in image_exts and tgt in image_exts) or (src in image_exts and tgt == "pdf") or (src in ["pdf", "svg"] and tgt in image_exts):
        return ImageEngine(progress_callback)
    elif cat in ["code"] or (src in code_exts and tgt in code_exts):
        return CodeEngine(progress_callback)
    elif tgt in archive_exts or src in archive_exts:
        return ArchiveEngine(progress_callback)
    else:
        return DocumentEngine(progress_callback)

__all__ = [
    "BaseConversionEngine",
    "MediaEngine",
    "ImageEngine",
    "DocumentEngine",
    "CodeEngine",
    "ArchiveEngine",
    "get_engine_for_category"
]

