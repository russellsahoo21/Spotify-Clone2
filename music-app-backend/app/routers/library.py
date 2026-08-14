from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.favorite import Favorite
from app.models.history import History
from app.models.user import User
from app.schemas.library import (
    FavoriteCreate,
    FavoriteResponse,
    HistoryCreate,
    HistoryResponse,
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


@router.get("/favorites", response_model=list[FavoriteResponse])
def get_favorites(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """List all favorite tracks for the user."""
    return (
        db.query(Favorite)
        .filter(Favorite.owner_id == current_user.id)
        .all()
    )


@router.post("/favorites", response_model=FavoriteResponse)
def add_favorite(
    payload: FavoriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a track to the user's favorites list."""
    existing = (
        db.query(Favorite)
        .filter(
            Favorite.owner_id == current_user.id,
            Favorite.video_id == payload.video_id,
        )
        .first()
    )
    if existing:
        return existing

    favorite = Favorite(
        video_id=payload.video_id,
        title=payload.title,
        artist=payload.artist,
        thumbnail_url=payload.thumbnail_url,
        duration=payload.duration,
        owner_id=current_user.id,
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/favorites/{video_id}")
def delete_favorite(
    video_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a track from the user's favorites list."""
    favorite = (
        db.query(Favorite)
        .filter(
            Favorite.owner_id == current_user.id,
            Favorite.video_id == video_id,
        )
        .first()
    )
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite track not found")

    db.delete(favorite)
    db.commit()
    return {"deleted": True, "video_id": video_id}


@router.get("/history", response_model=list[HistoryResponse])
def get_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retrieve play history for the user, ordered by recently played."""
    return (
        db.query(History)
        .filter(History.owner_id == current_user.id)
        .order_by(History.played_at.desc())
        .limit(50)
        .all()
    )


@router.post("/history", response_model=HistoryResponse)
def add_history(
    payload: HistoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a track to the user's play history."""
    # To keep history from expanding indefinitely, we can keep the entries reasonable
    history_entry = History(
        video_id=payload.video_id,
        title=payload.title,
        artist=payload.artist,
        thumbnail_url=payload.thumbnail_url,
        duration=payload.duration,
        owner_id=current_user.id,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return history_entry


@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear all play history for the current user."""
    db.query(History).filter(History.owner_id == current_user.id).delete()
    db.commit()
    return {"cleared": True}
