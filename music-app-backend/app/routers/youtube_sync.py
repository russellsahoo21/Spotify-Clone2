import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ytmusicapi import YTMusic

from app.database import SessionLocal
from app.models.playlist import Playlist
from app.models.playlist_song import PlaylistSong
from app.models.user import User
from app.services.track_filter import is_music_track
from app.utils.dependencies import get_current_user

router = APIRouter()
yt = YTMusic()


class ImportPlaylistRequest(BaseModel):
    playlist_url: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def extract_playlist_id(url: str) -> str:
    # Search for list=PL... parameter
    match = re.search(r"[?&]list=([^#\&\?]+)", url)
    if match:
        return match.group(1)
    # If no slashes exist, assume it might be a raw playlist ID
    if "/" not in url:
        return url
    return ""


@router.post("/import")
def import_youtube_playlist(
    payload: ImportPlaylistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import a public YouTube/YTMusic playlist by its URL into the user's library."""
    playlist_id = extract_playlist_id(payload.playlist_url)
    if not playlist_id:
        raise HTTPException(
            status_code=400, detail="Invalid YouTube/YTMusic playlist URL or ID"
        )

    try:
        # Fetch the playlist tracks using ytmusicapi
        raw_playlist = yt.get_playlist(playlistId=playlist_id)
        if not raw_playlist:
            raise HTTPException(
                status_code=404, detail="Playlist not found on YouTube Music"
            )

        title = raw_playlist.get("title", "Imported Playlist")
        description = raw_playlist.get("description") or f"Imported from: {payload.playlist_url}"

        # Create a new local playlist
        db_playlist = Playlist(
            title=title,
            description=description,
            owner_id=current_user.id,
        )
        db.add(db_playlist)
        db.commit()
        db.refresh(db_playlist)

        # Import all songs from the playlist
        raw_tracks = raw_playlist.get("tracks", [])
        imported_count = 0
        for track in raw_tracks:
            if not is_music_track(track):
                continue
            video_id = track.get("videoId")
            if not video_id:
                continue

            artists = ", ".join(
                [a.get("name") for a in track.get("artists", []) if a.get("name")]
            )
            thumbnails = track.get("thumbnails", [])
            thumbnail_url = thumbnails[-1].get("url") if thumbnails else None

            song = PlaylistSong(
                playlist_id=db_playlist.id,
                video_id=video_id,
                title=track.get("title", "Untitled Track"),
                artist=artists or "Unknown Artist",
                thumbnail_url=thumbnail_url,
                duration=track.get("duration"),
            )
            db.add(song)
            imported_count += 1

        db.commit()

        return {
            "success": True,
            "playlist_id": db_playlist.id,
            "title": db_playlist.title,
            "imported_tracks_count": imported_count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to import playlist: {str(e)}"
        )
