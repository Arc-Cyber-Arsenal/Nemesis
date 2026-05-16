"""
Credential SQLAlchemy model
Stores authentication credentials (bearer tokens, cookies, SSH creds, etc.)
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Credential(Base):
    __tablename__ = "credentials"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False)

    # Type and identification
    credential_type = Column(String(50), nullable=False)  # bearer_token, cookie, basic_auth, api_key, ssh, custom
    name = Column(String(255), nullable=False)  # Nom descriptif (ex: "Fleet Manager Auth")
    placeholder = Column(String(100), nullable=False)  # Ex: {{BEARER_TOKEN_FLEET}}

    # Data (depending on type)
    token = Column(Text, nullable=True)  # Pour bearer_token, api_key
    username = Column(String(255), nullable=True)  # Pour basic_auth, ssh
    password = Column(Text, nullable=True)  # Pour basic_auth, ssh
    cookie_value = Column(Text, nullable=True)  # Pour cookie
    custom_data = Column(JSONB, nullable=True)  # Pour custom (flexible JSON)

    # Contexte
    service = Column(String(100), nullable=True)  # Ex: "SSH", "API", "Web"
    target = Column(String(255), nullable=True)  # Ex: "192.168.1.10", "https://api.example.com"
    notes = Column(Text, nullable=True)

    # Metadata
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    discovered_by = Column(String(50), default="manual")  # "manual" ou "claude"

    # Relation
    assessment = relationship("Assessment", back_populates="credentials_list")
