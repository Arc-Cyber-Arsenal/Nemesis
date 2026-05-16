"""
Assessment Section SQLAlchemy model (Phases)
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class AssessmentSection(Base):
    __tablename__ = "assessment_sections"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    section_type = Column(String(50), nullable=False)  # recon, phase_1, phase_2, etc.
    section_number = Column(Numeric(3, 1))  # 1.0, 2.0, 3.1, 3.2
    title = Column(String(255))
    content = Column(Text)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationship
    assessment = relationship("Assessment", back_populates="sections")
