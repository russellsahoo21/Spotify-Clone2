from datetime import datetime, timedelta, timezone
from functools import lru_cache
from threading import Lock
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.recommendation import ListeningSession, RecommendationFeed, TrackDismissal
from app.models.user import User
from app.services.recommendations import recommend
from app.utils.dependencies import get_current_user, get_db

router = APIRouter()
PAGE_SIZE = 12


class ListeningUpdate(BaseModel):
    session_id: UUID
    video_id: str = Field(pattern=r"^[A-Za-z0-9_-]{11}$")
    title: str = Field(min_length=1, max_length=255)
    artist: str | None = Field(default=None, max_length=255)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    duration: str | None = Field(default=None, max_length=50)
    listened_seconds: float = Field(ge=0, le=86400, allow_inf_nan=False)
    duration_seconds: float = Field(ge=0, le=86400, allow_inf_nan=False)
    outcome: Literal["progress", "skip", "complete"] = "progress"


@router.post("/listening")
def record_listening(payload: ListeningUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    key = {"owner_id": user.id, "session_id": str(payload.session_id)}
    event = db.get(ListeningSession, key)
    if event is None:
        event = ListeningSession(**key, **payload.model_dump(exclude={"session_id"}), updated_at=datetime.now(timezone.utc))
        db.add(event)
        try:
            db.commit()
            return {"recorded": True}
        except IntegrityError:
            db.rollback()
            event = db.get(ListeningSession, key)
    if event is None or event.video_id != payload.video_id:
        raise HTTPException(409, "Listening session belongs to another track")
    # Retries and out-of-order heartbeats must not erase a skip or completion.
    terminal = payload.outcome != "progress"
    db.query(ListeningSession).filter_by(**key).filter(or_(
        ListeningSession.listened_seconds < payload.listened_seconds,
        (ListeningSession.outcome == "progress") if terminal else False,
    )).update({
        ListeningSession.listened_seconds: case(
            (ListeningSession.listened_seconds < payload.listened_seconds, payload.listened_seconds),
            else_=ListeningSession.listened_seconds,
        ),
        ListeningSession.duration_seconds: case(
            (ListeningSession.duration_seconds < payload.duration_seconds, payload.duration_seconds),
            else_=ListeningSession.duration_seconds,
        ),
        ListeningSession.outcome: case(
            (ListeningSession.outcome == "progress", payload.outcome), else_=ListeningSession.outcome,
        ),
        ListeningSession.updated_at: datetime.now(timezone.utc),
    }, synchronize_session=False)
    db.commit()
    return {"recorded": True}


@router.get("/dismissed")
def get_dismissed(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [row.video_id for row in db.query(TrackDismissal).filter_by(owner_id=user.id)]


@router.put("/dismissed/{video_id}")
def dismiss_track(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if len(video_id) != 11 or not all(c.isascii() and (c.isalnum() or c in "-_") for c in video_id):
        raise HTTPException(400, "Invalid video ID")
    if db.get(TrackDismissal, (user.id, video_id)) is None:
        db.add(TrackDismissal(owner_id=user.id, video_id=video_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    return {"dismissed": True}


@router.delete("/dismissed/{video_id}")
def restore_track(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(TrackDismissal).filter_by(owner_id=user.id, video_id=video_id).delete()
    db.commit()
    return {"dismissed": False}


@router.get("/autoplay/{video_id}")
def autoplay(video_id: str, exclude: str = Query(default="", max_length=2400), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if len(video_id) != 11 or not all(c.isascii() and (c.isalnum() or c in "-_") for c in video_id):
        raise HTTPException(400, "Invalid video ID")
    return recommend(db, user, limit=15, seed=video_id, exclude=exclude.split(","))


@lru_cache(maxsize=256)
def _feed_lock(user_id):
    return Lock()


def feed_page(db, user, page, feed_id=None, refresh=False):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    with _feed_lock(user.id):
        query = db.query(RecommendationFeed).filter(
            RecommendationFeed.owner_id == user.id, RecommendationFeed.created_at >= cutoff,
        )
        if feed_id:
            feed = query.filter(RecommendationFeed.id == feed_id).first()
            if feed is None:
                raise HTTPException(410, "Feed expired. Refresh recommendations.")
        else:
            feed = None if refresh else query.order_by(RecommendationFeed.created_at.desc()).first()
            if feed is None:
                tracks = recommend(db, user)
                if not tracks:
                    raise HTTPException(503, "Recommendations unavailable. Please retry.")
                feed = RecommendationFeed(id=str(uuid4()), owner_id=user.id, tracks=tracks, created_at=datetime.now(timezone.utc))
                db.add(feed)
                db.flush()
                keep_ids = [row.id for row in db.query(RecommendationFeed.id).filter_by(owner_id=user.id).order_by(RecommendationFeed.created_at.desc()).limit(3)]
                db.query(RecommendationFeed).filter(
                    RecommendationFeed.owner_id == user.id,
                    or_(RecommendationFeed.created_at < cutoff, ~RecommendationFeed.id.in_(keep_ids)),
                ).delete(synchronize_session=False)
                db.commit()
    dismissed = {row.video_id for row in db.query(TrackDismissal).filter_by(owner_id=user.id)}
    start = (page - 1) * PAGE_SIZE
    tracks = [track for track in feed.tracks[start:start + PAGE_SIZE] if track["id"] not in dismissed]
    return {
        "title": "Picked for You" if page == 1 else "More to Discover",
        "layout": "quick-picks" if page % 3 == 2 else "carousel",
        "tracks": tracks, "feed_id": feed.id,
        "has_more": start + PAGE_SIZE < len(feed.tracks),
    }
