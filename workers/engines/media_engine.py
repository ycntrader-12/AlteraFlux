import os
import re
import shutil
import subprocess
import logging
import time
from typing import Dict, Any, Optional, Callable
from workers.engines.base import BaseConversionEngine

logger = logging.getLogger(__name__)

class MediaEngine(BaseConversionEngine):
    @classmethod
    def _find_binary(cls, name: str) -> Optional[str]:
        found = shutil.which(name)
        if found:
            return found
        candidates = {
            "ffmpeg": [
                os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe"),
                r"C:\ffmpeg\bin\ffmpeg.exe",
                r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
                r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
            ],
            "ffprobe": [
                os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffprobe.exe"),
                r"C:\ffmpeg\bin\ffprobe.exe",
                r"C:\Program Files\ffmpeg\bin\ffprobe.exe",
                r"C:\ProgramData\chocolatey\bin\ffprobe.exe",
            ],
        }
        for path in candidates.get(name.lower(), []):
            if os.path.exists(path):
                return path
        return None

    def __init__(self, progress_callback: Optional[Callable[[float, str], None]] = None):
        super().__init__(progress_callback)
        self.ffmpeg_bin = self._find_binary("ffmpeg")
        self.ffprobe_bin = self._find_binary("ffprobe")
        self.has_ffmpeg = self.ffmpeg_bin is not None
        self.has_ffprobe = self.ffprobe_bin is not None

    def get_duration_seconds(self, input_path: str) -> float:
        """Détermine la durée totale du fichier média via ffprobe"""
        if not self.has_ffprobe:
            return 10.0
        try:
            cmd = [
                self.ffprobe_bin or "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                input_path
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as e:
            logger.warning(f"Impossible de lire la durée avec ffprobe: {e}")
            return 10.0

    def _parse_time_to_seconds(self, time_str: str) -> float:
        parts = time_str.split(":")
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        return 0.0

    def convert(
        self,
        input_path: str,
        output_path: str,
        source_format: str,
        target_format: str,
        options: Dict[str, Any]
    ) -> str:
        target_fmt = target_format.lower().lstrip(".")
        self.report_progress(5.0, "Analyse du flux audio/vidéo...")

        src_fmt = source_format.lower().lstrip(".")

        # Traitement natif des fichiers WAV pur Python sans dépendance externe
        if src_fmt == "wav" and target_fmt == "wav":
            try:
                import wave
                with wave.open(input_path, "rb") as r_wav:
                    params = r_wav.getparams()
                    frames = r_wav.readframes(r_wav.getnframes())
                with wave.open(output_path, "wb") as w_wav:
                    w_wav.setparams(params)
                    w_wav.writeframes(frames)
                self.report_progress(100.0, "Conversion audio WAV native réussie !")
                return output_path
            except Exception as e:
                logger.warning(f"Bascule WAV natif: {e}")

        if not self.has_ffmpeg:
            raise RuntimeError(
                f"Le transcodage média du format {src_fmt.upper()} vers {target_fmt.upper()} "
                "requiert le moteur FFmpeg installé sur le système hôte. "
                "Veuillez installer FFmpeg dans le PATH ou convertir vers un format pris en charge nativement."
            )

        total_duration = self.get_duration_seconds(input_path)
        self.report_progress(10.0, f"Démarrage de l'encodage vers {target_fmt.upper()}...")

        # Construction des arguments FFmpeg selon le type de cible
        cmd = [self.ffmpeg_bin or "ffmpeg", "-y", "-i", input_path]

        # 1. Vidéo vers GIF
        if target_fmt == "gif":
            # Filtre de palette pour une excellente qualité sans artefact
            fps = options.get("fps", 12)
            width = options.get("width", 480)
            vf_filter = f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
            cmd.extend(["-vf", vf_filter])

        # 2. Vidéo / Audio vers Audio pur (MP3, WAV, AAC, FLAC, OGG)
        elif target_fmt in ["mp3", "wav", "aac", "flac", "ogg", "m4a"]:
            cmd.append("-vn")  # Désactiver la vidéo
            audio_bitrate = options.get("audio_bitrate") or options.get("bitrate", "192k")
            if target_fmt == "mp3":
                cmd.extend(["-c:a", "libmp3lame", "-b:a", audio_bitrate])
            elif target_fmt == "wav":
                cmd.extend(["-c:a", "pcm_s16le"])
            elif target_fmt == "flac":
                cmd.extend(["-c:a", "flac"])
            elif target_fmt == "ogg":
                cmd.extend(["-c:a", "libvorbis", "-q:a", "4"])
            elif target_fmt in ["aac", "m4a"]:
                cmd.extend(["-c:a", "aac", "-b:a", audio_bitrate])

        # 3. Vidéo vers Vidéo (MP4, WEBM, MKV, AVI, MOV)
        else:
            quality = options.get("quality", "high")
            crf = "18" if quality == "high" else ("23" if quality == "medium" else "28")
            resolution = options.get("resolution", "original")

            if resolution != "original":
                res_map = {"1080p": "1920:1080", "720p": "1280:720", "480p": "854:480"}
                if resolution in res_map:
                    cmd.extend(["-vf", f"scale={res_map[resolution]}:force_original_aspect_ratio=decrease,pad={res_map[resolution]}:(ow-iw)/2:(oh-ih)/2"])

            if target_fmt == "webm":
                cmd.extend(["-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0", "-c:a", "libopus"])
            else:
                cmd.extend(["-c:v", "libx264", "-preset", "medium", "-crf", crf, "-c:a", "aac", "-b:a", "192k"])

        cmd.extend(["-progress", "pipe:1", output_path])

        logger.info(f"Exécution commande FFmpeg: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        time_regex = re.compile(r"out_time=(\d{2}:\d{2}:\d{2}\.\d+)")
        progress_val = 15.0

        if process.stdout:
            for line in process.stdout:
                line = line.strip()
                match = time_regex.search(line)
                if match and total_duration > 0:
                    current_time = self._parse_time_to_seconds(match.group(1))
                    ratio = min(current_time / total_duration, 0.98)
                    progress_val = 10.0 + ratio * 85.0
                    self.report_progress(progress_val, f"Encodage en cours ({int(progress_val)}%)...")

        process.wait()
        if process.returncode != 0:
            stderr = process.stderr.read() if process.stderr else "Erreur FFmpeg inconnue"
            logger.error(f"Erreur d'encodage FFmpeg: {stderr}")
            raise RuntimeError(f"Échec de l'encodage FFmpeg: {stderr[-200:]}")

        self.report_progress(98.0, "Finalisation du conteneur...")
        return output_path
