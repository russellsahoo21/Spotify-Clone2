from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.playlist import Playlist
from app.models.playlist_song import PlaylistSong
from app.models.user import User
from app.schemas.playlist import (
    PlaylistCreate,
    PlaylistResponse,
    PlaylistSongCreate,
    PlaylistSongResponse,
    PlaylistUpdate,
)
from app.utils.dependencies import get_current_user

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.get("/", response_model=list[PlaylistResponse])
def list_playlists(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retrieve all playlists belonging to the current user."""
    return db.query(Playlist).filter(Playlist.owner_id == current_user.id).all()


@router.post("/", response_model=PlaylistResponse, status_code=201)
def create_playlist(
    payload: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new playlist for the current user."""
    playlist = Playlist(
        title=payload.title,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist


@router.get("/{playlist_id}", response_model=PlaylistResponse)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the details and songs of a specific playlist."""
    playlist = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.owner_id == current_user.id)
        .first()
    )
    if not playlist:
        raise HTTPException(
            status_code=404, detail="Playlist not found or access denied"
        )
    return playlist


@router.put("/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(
    playlist_id: int,
    payload: PlaylistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update playlist title or description."""
    playlist = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.owner_id == current_user.id)
        .first()
    )
    if not playlist:
        raise HTTPException(
            status_code=404, detail="Playlist not found or access denied"
        )

    if payload.title is not None:
        playlist.title = payload.title
    if payload.description is not None:
        playlist.description = payload.description

    db.commit()
    db.refresh(playlist)
    return playlist


@router.delete("/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a playlist."""
    playlist = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.owner_id == current_user.id)
        .first()
    )
    if not playlist:
        raise HTTPException(
            status_code=404, detail="Playlist not found or access denied"
        )

    db.delete(playlist)
    db.commit()
    return {"deleted": True, "playlist_id": playlist_id}


@router.post("/{playlist_id}/songs", response_model=PlaylistSongResponse)
def add_song_to_playlist(
    playlist_id: int,
    payload: PlaylistSongCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a song to a playlist."""
    playlist = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.owner_id == current_user.id)
        .first()
    )
    if not playlist:
        raise HTTPException(
            status_code=404, detail="Playlist not found or access denied"
        )

    # Check if song already exists in this playlist to avoid duplicates
    existing_song = (
        db.query(PlaylistSong)
        .filter(
            PlaylistSong.playlist_id == playlist_id,
            PlaylistSong.video_id == payload.video_id,
        )
        .first()
    )
    if existing_song:
        return existing_song

    playlist_song = PlaylistSong(
        playlist_id=playlist_id,
        video_id=payload.video_id,
        title=payload.title,
        artist=payload.artist,
        thumbnail_url=payload.thumbnail_url,
        duration=payload.duration,
    )
    db.add(playlist_song)
    db.commit()
    db.refresh(playlist_song)
    return playlist_song


@router.delete("/{playlist_id}/songs/{video_id}")
def remove_song_from_playlist(
    playlist_id: int,
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a song from a playlist by its YouTube video_id."""
    playlist = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.owner_id == current_user.id)
        .first()
    )
    if not playlist:
        raise HTTPException(
            status_code=404, detail="Playlist not found or access denied"
        )

    song = (
        db.query(PlaylistSong)
        .filter(
            PlaylistSong.playlist_id == playlist_id,
            PlaylistSong.video_id == video_id,
        )
        .first()
    )
    if not song:
        raise HTTPException(
            status_code=404, detail="Song not found in playlist"
        )

    db.delete(song)
    db.commit()
    return {"deleted": True, "video_id": video_id}
