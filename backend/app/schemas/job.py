from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field

class PresignedUrlRequest(BaseModel):
    filename: str = Field(..., description="Nom d'origine du fichier")
    content_type: str = Field(..., description="Type MIME du fichier")
    size_bytes: int = Field(default=0, description="Taille estimée en octets")

class PresignedUrlResponse(BaseModel):
    upload_url: str
    key: str
    filename: str
    expires_in_seconds: int = 3600
    headers: Dict[str, str] = Field(default_factory=dict)
    is_direct_upload: bool = True

class JobCreate(BaseModel):
    filename: str
    source_key: str
    source_format: str
    target_format: str
    category: Optional[str] = None
    source_size_bytes: Optional[int] = 0
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)

class JobResponse(BaseModel):
    id: str
    filename: str
    source_key: str
    source_format: str
    source_size_bytes: int
    target_format: str
    category: str
    status: str
    progress: float
    stage: str
    options: Dict[str, Any]
    result_key: Optional[str] = None
    result_filename: Optional[str] = None
    result_size_bytes: Optional[int] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    expires_at: Optional[str] = None

class JobProgressUpdate(BaseModel):
    job_id: str
    progress: float
    stage: str
    status: Optional[str] = None
    error_message: Optional[str] = None
    result_key: Optional[str] = None
    result_filename: Optional[str] = None
    result_size_bytes: Optional[int] = None

class FormatOption(BaseModel):
    id: str
    label: str
    description: str
    popular: bool = False

class CategoryPresets(BaseModel):
    category: str
    icon: str
    source_extensions: List[str]
    target_formats: List[FormatOption]
