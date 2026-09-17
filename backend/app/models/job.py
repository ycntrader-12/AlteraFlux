import uuid
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON
from app.database import Base

class ConversionJob(Base):
    __tablename__ = "conversion_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    source_key = Column(String(512), nullable=False)
    source_format = Column(String(32), nullable=False)
    source_size_bytes = Column(Integer, default=0)
    target_format = Column(String(32), nullable=False)
    category = Column(String(32), nullable=False)  # video, audio, image, document, code
    
    # Statut : QUEUED, PROCESSING, COMPLETED, FAILED, EXPIRED
    status = Column(String(32), default="QUEUED", index=True)
    progress = Column(Float, default=0.0)
    stage = Column(String(128), default="Mise en file d'attente...")
    
    # Options de conversion avancées (bitrate, résolution, prompt IA, etc.)
    options = Column(JSON, default=dict)
    
    # Résultat
    result_key = Column(String(512), nullable=True)
    result_filename = Column(String(255), nullable=True)
    result_size_bytes = Column(Integer, nullable=True)
    download_url = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Horodatages & Éphéméralité (24h)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=24))

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "source_key": self.source_key,
            "source_format": self.source_format,
            "source_size_bytes": self.source_size_bytes,
            "target_format": self.target_format,
            "category": self.category,
            "status": self.status,
            "progress": round(self.progress, 1),
            "stage": self.stage,
            "options": self.options or {},
            "result_key": self.result_key,
            "result_filename": self.result_filename,
            "result_size_bytes": self.result_size_bytes,
            "download_url": self.download_url,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
