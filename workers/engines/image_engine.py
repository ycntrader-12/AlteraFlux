import os
import logging
from typing import Dict, Any, Optional, Callable
from PIL import Image
from workers.engines.base import BaseConversionEngine

logger = logging.getLogger(__name__)

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    pillow_heif.register_avif_opener()
except Exception:
    pass

class ImageEngine(BaseConversionEngine):
    def __init__(self, progress_callback: Optional[Callable[[float, str], None]] = None):
        super().__init__(progress_callback)

    def convert(
        self,
        input_path: str,
        output_path: str,
        source_format: str,
        target_format: str,
        options: Dict[str, Any]
    ) -> str:
        target_fmt = target_format.lower().lstrip(".")
        src_fmt = source_format.lower().lstrip(".")
        self.report_progress(10.0, "Chargement de la source...")

        # Support PDF et SVG vers Image (PNG / JPG / WEBP) via PyMuPDF (fitz)
        if src_fmt in ["pdf", "svg"]:
            try:
                import fitz
                doc = fitz.open(input_path)
                if len(doc) > 0:
                    page = doc[0]
                    pix = page.get_pixmap(dpi=150)
                    pix.save(output_path)
                    doc.close()
                    self.report_progress(100.0, f"Rendu du {src_fmt.upper()} vers {target_fmt.upper()} réussi !")
                    return output_path
            except Exception as e:
                logger.warning(f"Bascule PyMuPDF {src_fmt}->Image: {e}")

        with Image.open(input_path) as img:
            self.report_progress(30.0, f"Analyse dimensions ({img.width}x{img.height})...")

            # Options
            quality = int(options.get("quality", 85))
            max_width = options.get("max_width")
            max_height = options.get("max_height")

            # Redimensionnement avec préservation du ratio
            if max_width or max_height:
                w = int(max_width) if max_width else img.width
                h = int(max_height) if max_height else img.height
                img.thumbnail((w, h), Image.Resampling.LANCZOS)
                self.report_progress(50.0, f"Redimensionnement ({img.width}x{img.height})...")

            # Gestion des canaux de couleur & transparence
            self.report_progress(70.0, f"Conversion vers le format {target_fmt.upper()}...")

            save_params: Dict[str, Any] = {}

            if target_fmt in ["jpg", "jpeg"]:
                if img.mode in ("RGBA", "LA", "P"):
                    # Créer un fond blanc pour les formats sans canal alpha
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = bg
                else:
                    img = img.convert("RGB")
                save_params = {"quality": quality, "optimize": True}

            elif target_fmt == "webp":
                save_params = {
                    "quality": quality,
                    "method": 6,
                    "lossless": options.get("lossless", False)
                }

            elif target_fmt == "png":
                save_params = {"optimize": True}

            elif target_fmt == "ico":
                sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
                img.save(output_path, format="ICO", sizes=sizes)
                self.report_progress(100.0, "Génération Favicon ICO terminée !")
                return output_path

            elif target_fmt == "pdf":
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(output_path, "PDF", resolution=100.0)
                self.report_progress(100.0, "Export PDF terminé !")
                return output_path

            # Format PIL standard
            pil_format_map = {
                "jpg": "JPEG",
                "jpeg": "JPEG",
                "png": "PNG",
                "webp": "WEBP",
                "bmp": "BMP",
                "tiff": "TIFF",
                "gif": "GIF"
            }
            pil_fmt = pil_format_map.get(target_fmt, target_fmt.upper())

            self.report_progress(90.0, "Compression & écriture disque...")
            img.save(output_path, format=pil_fmt, **save_params)

        self.report_progress(100.0, "Conversion d'image réussie !")
        return output_path
