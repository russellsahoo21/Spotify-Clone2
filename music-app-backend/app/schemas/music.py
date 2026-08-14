from pydantic import BaseModel


class Track(BaseModel):
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None


class Album(BaseModel):
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None


class Artist(BaseModel):
    name: str
    thumbnail_url: str | None = None
