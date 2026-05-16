"""
Command History SQLAlchemy model
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class CommandHistory(Base):
    __tablename__ = "command_history"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    container_name = Column(String(100))
    command = Column(Text, nullable=False)
    stdout = Column(Text)
    stderr = Column(Text)
    returncode = Column(Integer)
    execution_time = Column(Float)
    success = Column(Boolean)
    phase = Column(String(50))  # Which phase was active
    status = Column(String(50), default="completed")  # completed, failed, timeout, running
    timeout_at = Column(TIMESTAMP, nullable=True)  # When timeout occurred
    command_type = Column(String(20), default='shell')  # 'shell' | 'python'
    source_code = Column(Text, nullable=True)  # Raw Python code (for python_exec)

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationship
    assessment = relationship("Assessment", back_populates="command_history")
