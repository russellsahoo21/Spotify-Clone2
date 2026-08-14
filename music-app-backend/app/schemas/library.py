from datetime import datetime
from pydantic import BaseModel


class FavoriteCreate(BaseModel):
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None


class FavoriteResponse(BaseModel):
    id: int
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None
    owner_id: int

    class Config:
        from_attributes = True


class HistoryCreate(BaseModel):
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None


class HistoryResponse(BaseModel):
    id: int
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None
    played_at: datetime
    owner_id: int

    class Config:
        from_attributes = True
