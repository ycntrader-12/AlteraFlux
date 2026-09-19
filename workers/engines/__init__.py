from workers.engines.base import BaseConversionEngine
from workers.engines.media_engine import MediaEngine
from workers.engines.image_engine import ImageEngine
from workers.engines.document_engine import DocumentEngine
from workers.engines.code_engine import CodeEngine

def get_engine_for_category(
    category: str = "",
    source_format: str = "",
    target_format: str = "",
    progress_callback=None
) -> BaseConversionEngine:
    cat = (category or "").lower().replace("é", "e").replace("è", "e").strip()
    src = (source_format or "").lower().lstrip(".")
    tgt = (target_format or "").lower().lstrip(".")

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

    if cat in ["video", "audio"] or src in video_audio_exts or tgt in video_audio_exts:
        return MediaEngine(progress_callback)
    elif cat in ["image", "images"] or src in image_exts or tgt in image_exts:
        return ImageEngine(progress_callback)
    elif cat in ["code"] or src in code_exts or tgt in code_exts:
        return CodeEngine(progress_callback)
    else:
        return DocumentEngine(progress_callback)

__all__ = [
    "BaseConversionEngine",
    "MediaEngine",
    "ImageEngine",
    "DocumentEngine",
    "CodeEngine",
    "get_engine_for_category"
]
