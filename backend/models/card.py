"""
Card SQLAlchemy model (Finding/Observation/Info)
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    card_type = Column(String(50), nullable=False)  # finding, observation, info
    section_number = Column(String(20), index=True)  # "3.2", "4.5"

    title = Column(String(255), nullable=False)
    target_service = Column(String(255))

    # Finding specific
    status = Column(String(50))  # confirmed, potential, untested
    severity = Column(String(20))  # CRITICAL, HIGH, MEDIUM, LOW, INFO

    # CVSS 4.0
    cvss_vector = Column(String(255))  # e.g. "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N"
    cvss_score = Column(Float)          # e.g. 9.3

    # Common fields
    technical_analysis = Column(Text)
    notes = Column(Text)
    proof = Column(Text)
    context = Column(Text)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationship
    assessment = relationship("Assessment", back_populates="cards")
