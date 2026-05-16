"""
Pydantic schemas for Credential model
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class CredentialBase(BaseModel):
    """Base schema for Credential"""
    credential_type: str = Field(..., description="Type: bearer_token, cookie, basic_auth, api_key, ssh, custom")
    name: str = Field(..., description="Descriptive name (e.g., 'Fleet Manager Auth')")
    placeholder: str = Field(..., description="Placeholder for command substitution (e.g., '{{BEARER_TOKEN_FLEET}}')")

    # Optional data depending on type
    token: Optional[str] = Field(None, description="Token value (for bearer_token, api_key)")
    username: Optional[str] = Field(None, description="Username (for basic_auth, ssh)")
    password: Optional[str] = Field(None, description="Password (for basic_auth, ssh)")
    cookie_value: Optional[str] = Field(None, description="Cookie string (for cookie type)")
    custom_data: Optional[Dict[str, Any]] = Field(None, description="Custom data (JSON)")

    # Contexte
    service: Optional[str] = Field(None, description="Service name (SSH, API, Web, etc.)")
    target: Optional[str] = Field(None, description="Target URL or IP")
    notes: Optional[str] = Field(None, description="Additional notes")

    discovered_by: Optional[str] = Field("manual", description="Source: manual or claude")


class CredentialCreate(CredentialBase):
    """Schema for creating a new Credential"""
    pass


class CredentialUpdate(BaseModel):
    """Schema for updating a Credential (all fields optional)"""
    credential_type: Optional[str] = None
    name: Optional[str] = None
    placeholder: Optional[str] = None
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    cookie_value: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None
    service: Optional[str] = None
    target: Optional[str] = None
    notes: Optional[str] = None


class CredentialResponse(CredentialBase):
    """Schema for Credential response"""
    id: int
    assessment_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CredentialListResponse(BaseModel):
    """Schema for listing credentials with summary"""
    credentials: list[CredentialResponse]
    total: int
    by_type: Dict[str, int]  # Count by credential_type
