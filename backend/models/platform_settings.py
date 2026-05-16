"""
Platform Settings model for dynamic configuration
"""
from sqlalchemy import Column, Integer, String, Text
from database import Base


class PlatformSettings(Base):
    __tablename__ = "platform_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text)
