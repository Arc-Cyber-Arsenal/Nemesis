"""
Assessment Section Pydantic schemas
"""
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class SectionBase(BaseModel):
    section_type: str  # recon, phase_1, phase_2, etc.
    section_number: Decimal
    title: Optional[str] = None
    content: Optional[str] = None


class SectionCreate(SectionBase):
    """Schema for creating a section"""
    pass


class SectionUpdate(BaseModel):
    """Schema for updating a section (all fields optional)"""
    section_type: Optional[str] = None
    section_number: Optional[Decimal] = None
    title: Optional[str] = None
    content: Optional[str] = None


class SectionResponse(SectionBase):
    """Schema for section response"""
    id: int
    assessment_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
