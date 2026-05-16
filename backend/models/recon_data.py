"""
Recon Data SQLAlchemy model
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class ReconData(Base):
    __tablename__ = "recon_data"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    data_type = Column(String(50), nullable=False)  # endpoint, technology, service, subdomain
    name = Column(String(255), nullable=False)
    details = Column(JSONB)  # Flexible JSON for any metadata
    discovered_in_phase = Column(String(50))

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationship
    assessment = relationship("Assessment", back_populates="recon_data")
