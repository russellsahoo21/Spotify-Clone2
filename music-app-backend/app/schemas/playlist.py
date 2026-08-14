from pydantic import BaseModel


class PlaylistSongResponse(BaseModel):
    id: int
    playlist_id: int
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None

    class Config:
        from_attributes = True


class PlaylistCreate(BaseModel):
    title: str
    description: str | None = None


class PlaylistUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class PlaylistResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    owner_id: int
    songs: list[PlaylistSongResponse] = []

    class Config:
        from_attributes = True


class PlaylistSongCreate(BaseModel):
    video_id: str
    title: str
    artist: str | None = None
    thumbnail_url: str | None = None
    duration: str | None = None
