"""
Folder Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FolderBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#06b6d4"


class FolderCreate(FolderBase):
    """Schema for creating a new folder"""
    pass


class FolderUpdate(BaseModel):
    """Schema for updating a folder (all fields optional)"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FolderResponse(FolderBase):
    """Schema for folder response"""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FolderWithCount(FolderResponse):
    """Schema for folder with assessment count"""
    assessment_count: int







