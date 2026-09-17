from workers.engines.base import BaseConversionEngine
from workers.engines.media_engine import MediaEngine
from workers.engines.image_engine import ImageEngine
from workers.engines.document_engine import DocumentEngine
from workers.engines.code_engine import CodeEngine

def get_engine_for_category(category: str, progress_callback=None) -> BaseConversionEngine:
    cat = category.lower()
    if cat in ["video", "audio"]:
        return MediaEngine(progress_callback)
    elif cat == "image":
        return ImageEngine(progress_callback)
    elif cat == "code":
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
