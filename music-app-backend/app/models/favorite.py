from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(String(50), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User", back_populates="favorites")
