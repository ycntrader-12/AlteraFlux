from abc import ABC, abstractmethod
from typing import Callable, Optional, Dict, Any

class BaseConversionEngine(ABC):
    def __init__(self, progress_callback: Optional[Callable[[float, str], None]] = None):
        self.progress_callback = progress_callback

    def report_progress(self, percent: float, stage: str):
        """Notifie l'avancement (0.0 à 100.0) et l'étape courante"""
        if self.progress_callback:
            self.progress_callback(min(max(round(percent, 1), 0.0), 100.0), stage)

    @abstractmethod
    def convert(
        self,
        input_path: str,
        output_path: str,
        source_format: str,
        target_format: str,
        options: Dict[str, Any]
    ) -> str:
        """
        Exécute la conversion et retourne le chemin absolu du fichier résultant
        """
        pass
