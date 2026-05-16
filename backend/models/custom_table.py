"""
Custom Table SQLAlchemy model (Claude-generated dynamic tables)
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, ARRAY, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class CustomTable(Base):
    __tablename__ = "custom_tables"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    table_name = Column(String(255), nullable=False)
    section_number = Column(String(20))
    headers = Column(ARRAY(Text))  # Column names
    rows = Column(ARRAY(JSONB))  # Array of JSON objects for each row

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationship
    assessment = relationship("Assessment", back_populates="custom_tables")
