from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String, func

from app.database import Base


class ListeningSession(Base):
    __tablename__ = "listening_sessions"

    owner_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    session_id = Column(String(36), primary_key=True)
    video_id = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    duration = Column(String(50), nullable=True)
    listened_seconds = Column(Float, nullable=False, default=0)
    duration_seconds = Column(Float, nullable=False, default=0)
    outcome = Column(String(20), nullable=False, default="progress")
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)


class TrackDismissal(Base):
    __tablename__ = "track_dismissals"

    owner_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    video_id = Column(String(100), primary_key=True)


class RecommendationFeed(Base):
    __tablename__ = "recommendation_feeds"

    id = Column(String(36), primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tracks = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
