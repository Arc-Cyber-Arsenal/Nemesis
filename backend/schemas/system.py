"""
System information and status schemas
"""
from pydantic import BaseModel


class BackendStatus(BaseModel):
    """Backend API status"""
    status: str  # 'connected' or 'error'
    latency: int  # milliseconds
    version: str


class DatabaseStatus(BaseModel):
    """Database status"""
    status: str
    connected: bool
    version: str


class ExegolStatus(BaseModel):
    """Exegol container status"""
    status: str
    running: bool
    container: str


class SystemStatusResponse(BaseModel):
    """System status response"""
    backend: BackendStatus
    database: DatabaseStatus
    exegol: ExegolStatus


class SystemInfoResponse(BaseModel):
    """System information response"""
    platform_name: str
    tagline: str
    version: str
    fastapi_version: str
    python_version: str
    workspace_base: str
    container_name: str
    environment: str


class PlatformSettingResponse(BaseModel):
    """Platform setting response"""
    key: str
    value: str
    description: str | None = None


class UpdateSettingRequest(BaseModel):
    """Request to update a platform setting"""
    value: str
