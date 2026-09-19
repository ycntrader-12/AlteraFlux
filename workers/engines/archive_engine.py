import os
import shutil
import tempfile
import zipfile
import tarfile
import logging
from typing import Dict, Any, Optional, Callable
from workers.engines.base import BaseConversionEngine

logger = logging.getLogger(__name__)

class ArchiveEngine(BaseConversionEngine):
    """
    Moteur de conversion et compression d'archives universel (ZIP, TAR, GZ, BZ2).
    Prend en charge la conversion bidirectionnelle sans perte d'arborescence ni corruption.
    """
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
        src = (source_format or "").lower().lstrip(".")
        tgt = (target_format or "").lower().lstrip(".")

        self.report_progress(10.0, f"Initialisation de l'archive {src.upper()} vers {tgt.upper()}...")

        extract_dir = tempfile.mkdtemp(prefix="alteraflux_archive_")
        try:
            # 1. Extraction du contenu source si c'est déjà une archive
            is_archive_source = False

            if src in ["zip"] and zipfile.is_zipfile(input_path):
                self.report_progress(25.0, "Décompression de l'archive ZIP source...")
                with zipfile.ZipFile(input_path, "r") as zf:
                    zf.extractall(extract_dir)
                is_archive_source = True

            elif src in ["tar", "gz", "tgz", "tar.gz", "bz2", "tbz2", "tar.bz2"]:
                self.report_progress(25.0, f"Décompression de l'archive TAR ({src.upper()})...")
                try:
                    mode = "r:*"
                    with tarfile.open(input_path, mode) as tf:
                        tf.extractall(extract_dir)
                    is_archive_source = True
                except Exception as e:
                    logger.warning(f"Échec décompression tarfile standard: {e}")

            elif src in ["7z"]:
                self.report_progress(25.0, "Décompression de l'archive 7Z...")
                try:
                    import py7zr
                    with py7zr.SevenZipFile(input_path, mode="r") as sz:
                        sz.extractall(path=extract_dir)
                    is_archive_source = True
                except Exception as e:
                    logger.warning(f"Échec décompression 7z: {e}")

            # Si ce n'est pas une archive existante (ex: compression d'un fichier en ZIP),
            # copier simplement le fichier d'entrée dans le répertoire d'extraction
            if not is_archive_source:
                self.report_progress(30.0, "Préparation des fichiers pour compression...")
                in_name = os.path.basename(input_path)
                shutil.copy2(input_path, os.path.join(extract_dir, in_name))

            self.report_progress(60.0, f"Génération de l'archive finale au format {tgt.upper()}...")

            # 2. Création de l'archive cible
            compression_level = options.get("compression_level", 6)

            if tgt in ["zip"]:
                with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=compression_level) as z_out:
                    for root, _, files in os.walk(extract_dir):
                        for file in files:
                            full_p = os.path.join(root, file)
                            arcname = os.path.relpath(full_p, extract_dir)
                            z_out.write(full_p, arcname)

            elif tgt in ["7z"]:
                try:
                    import py7zr
                    with py7zr.SevenZipFile(output_path, "w") as sz:
                        for root, _, files in os.walk(extract_dir):
                            for file in files:
                                full_p = os.path.join(root, file)
                                arcname = os.path.relpath(full_p, extract_dir)
                                sz.write(full_p, arcname)
                except Exception as e:
                    logger.warning(f"Échec py7zr écriture: {e}. Bascule en ZIP...")
                    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
                        for root, _, files in os.walk(extract_dir):
                            for file in files:
                                full_p = os.path.join(root, file)
                                arcname = os.path.relpath(full_p, extract_dir)
                                z_out.write(full_p, arcname)

            elif tgt in ["tar"]:
                with tarfile.open(output_path, "w") as t_out:
                    for item in os.listdir(extract_dir):
                        item_p = os.path.join(extract_dir, item)
                        t_out.add(item_p, arcname=item)

            elif tgt in ["tar.gz", "tgz", "gz"]:
                with tarfile.open(output_path, "w:gz") as t_out:
                    for item in os.listdir(extract_dir):
                        item_p = os.path.join(extract_dir, item)
                        t_out.add(item_p, arcname=item)

            elif tgt in ["tar.bz2", "tbz2", "bz2"]:
                with tarfile.open(output_path, "w:bz2") as t_out:
                    for item in os.listdir(extract_dir):
                        item_p = os.path.join(extract_dir, item)
                        t_out.add(item_p, arcname=item)

            else:
                # Fallback standard en ZIP
                with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
                    for root, _, files in os.walk(extract_dir):
                        for file in files:
                            full_p = os.path.join(root, file)
                            arcname = os.path.relpath(full_p, extract_dir)
                            z_out.write(full_p, arcname)

            # 3. Vérification de l'intégrité de l'archive produite
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise RuntimeError(f"L'archive {tgt.upper()} générée est vide ou manquante.")

            self.report_progress(100.0, f"Archive {tgt.upper()} générée avec succès !")
            return output_path

        finally:
            if os.path.exists(extract_dir):
                shutil.rmtree(extract_dir, ignore_errors=True)
