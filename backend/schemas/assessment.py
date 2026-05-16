"""
Assessment Pydantic schemas
"""
import re
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator

# Safe characters: alphanumeric, spaces, underscores, hyphens, dots
_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9 _.\-()]{0,254}$')


class AssessmentBase(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Assessment name cannot be empty')
        if not _NAME_PATTERN.match(v):
            raise ValueError(
                'Assessment name must start with an alphanumeric character and '
                'contain only letters, digits, spaces, underscores, hyphens, dots, or parentheses (max 255 chars)'
            )
        return v
    client_name: Optional[str] = None
    scope: Optional[str] = None
    limitations: Optional[str] = None
    objectives: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_domains: Optional[list[str]] = None
    ip_scopes: Optional[list[str]] = None
    credentials: Optional[str] = None
    access_info: Optional[str] = None
    category: Optional[str] = None
    environment: Optional[str] = "non_specifie"
    environment_notes: Optional[str] = None


class AssessmentCreate(AssessmentBase):
    """Schema for creating a new assessment"""
    pass


class AssessmentUpdate(BaseModel):
    """Schema for updating an assessment (all fields optional)"""
    name: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError('Assessment name cannot be empty')
        if not _NAME_PATTERN.match(v):
            raise ValueError(
                'Assessment name must start with an alphanumeric character and '
                'contain only letters, digits, spaces, underscores, hyphens, dots, or parentheses (max 255 chars)'
            )
        return v
    client_name: Optional[str] = None
    scope: Optional[str] = None
    limitations: Optional[str] = None
    objectives: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_domains: Optional[list[str]] = None
    ip_scopes: Optional[list[str]] = None
    credentials: Optional[str] = None
    access_info: Optional[str] = None
    category: Optional[str] = None
    environment: Optional[str] = None
    environment_notes: Optional[str] = None
    status: Optional[str] = None  # active, completed, archived
    folder_id: Optional[int] = None


class AssessmentResponse(AssessmentBase):
    """Schema for assessment response"""
    id: int
    status: str  # active, completed, archived
    workspace_path: Optional[str]
    container_name: Optional[str]
    folder_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssessmentListResponse(BaseModel):
    """Schema for list of assessments"""
    id: int
    name: str
    client_name: Optional[str]
    category: Optional[str]
    environment: Optional[str]
    scope: Optional[str]
    limitations: Optional[str]
    objectives: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    target_domains: Optional[list[str]]
    ip_scopes: Optional[list[str]]
    status: str  # active, completed, archived
    workspace_path: Optional[str]
    container_name: Optional[str]
    folder_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DuplicateAssessmentRequest(BaseModel):
    name: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError('Assessment name cannot be empty')
        if not _NAME_PATTERN.match(v):
            raise ValueError(
                'Assessment name must start with an alphanumeric character and '
                'contain only letters, digits, spaces, underscores, hyphens, dots, or parentheses (max 255 chars)'
            )
        return v
    include_cards: bool = False
    include_sections: bool = False
    include_recon: bool = False
    include_commands: bool = False
