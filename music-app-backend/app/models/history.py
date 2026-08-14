from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database import Base


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(String(50), nullable=True)
    played_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="histories")
