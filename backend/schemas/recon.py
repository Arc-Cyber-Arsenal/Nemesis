"""
Recon Data Pydantic schemas
"""
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, ConfigDict, field_validator


class ReconDataBase(BaseModel):
    data_type: str  # Any category, normalized to lowercase snake_case
    name: str
    details: Optional[dict[str, Any]] = None
    discovered_in_phase: Optional[str] = None

    @field_validator('data_type')
    @classmethod
    def normalize_data_type_field(cls, v: str) -> str:
        """Normalize data_type to lowercase snake_case"""
        from utils.recon_utils import normalize_data_type
        return normalize_data_type(v)


class ReconDataCreate(ReconDataBase):
    """Schema for creating recon data"""
    pass


class ReconDataUpdate(BaseModel):
    """Schema for updating recon data (all fields optional)"""
    data_type: Optional[str] = None
    name: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    discovered_in_phase: Optional[str] = None


class ReconDataResponse(ReconDataBase):
    """Schema for recon data response"""
    id: int
    assessment_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Recon-Beast Import Schemas

class ReconImportRequest(BaseModel):
    """Request schema for importing Recon-Beast results"""
    recon_path: str

    model_config = ConfigDict(str_strip_whitespace=True)


class ReconImportStats(BaseModel):
    """Statistics from a recon import operation"""
    subdomains: int = 0
    ports: int = 0
    technologies: int = 0
    endpoints: int = 0
    findings: int = 0
    folders: int = 0

    @property
    def total(self) -> int:
        """Total number of items imported"""
        return (
            self.subdomains +
            self.ports +
            self.technologies +
            self.endpoints +
            self.findings +
            self.folders
        )


class ReconImportResponse(BaseModel):
    """Response schema for recon import operation"""
    success: bool
    message: str
    stats: ReconImportStats

    model_config = ConfigDict(from_attributes=True)


# Preview Schemas

class PreviewItem(BaseModel):
    """Preview of a single item that can be imported"""
    id: str
    name: str
    type: str  # subdomain, service, technology, endpoint, finding
    in_scope: bool = True
    is_external: bool = False
    # Additional fields vary by type
    ip: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    service: Optional[str] = None
    url: Optional[str] = None
    version: Optional[str] = None
    source_url: Optional[str] = None
    domain: Optional[str] = None
    finding_type: Optional[str] = None
    target: Optional[str] = None
    severity: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PreviewStats(BaseModel):
    """Statistics for preview"""
    subdomains: int = 0
    services: int = 0
    technologies: int = 0
    endpoints: int = 0
    findings: int = 0
    total: int = 0
    in_scope: int = 0
    out_of_scope: int = 0


class PreviewItems(BaseModel):
    """Collection of preview items by type"""
    subdomains: List[PreviewItem] = []
    services: List[PreviewItem] = []
    technologies: List[PreviewItem] = []
    endpoints: List[PreviewItem] = []
    findings: List[PreviewItem] = []


class ReconPreviewResponse(BaseModel):
    """Preview response before import with all items"""
    success: bool
    scan_path: str
    items: PreviewItems
    stats: PreviewStats

    model_config = ConfigDict(from_attributes=True)


class ReconImportWithSelection(BaseModel):
    """Request schema for importing with item selection"""
    recon_path: str
    selected_items: List[str] = []  # List of item IDs to import (e.g., "subdomain_example.com", "service_example.com_443")
    import_all: bool = False  # If true, ignore selected_items and import everything

    model_config = ConfigDict(str_strip_whitespace=True)
