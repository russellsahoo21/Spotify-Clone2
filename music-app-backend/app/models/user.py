from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    onboarded = Column(Boolean, default=False, nullable=True)
    genres = Column(String(550), nullable=True)
    artists = Column(String(950), nullable=True)

    playlists = relationship("Playlist", back_populates="owner")
    favorites = relationship("Favorite", back_populates="owner")
    histories = relationship("History", back_populates="owner")
