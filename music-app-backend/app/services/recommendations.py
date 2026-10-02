"""Hybrid recommendations: behavior, related songs, content, and similar listeners."""

from collections import Counter, defaultdict
from concurrent.futures import Future, ThreadPoolExecutor, wait
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import logging
import math
import re
from threading import BoundedSemaphore
from time import time
import unicodedata

import requests
from sqlalchemy import func
from ytmusicapi import YTMusic

from app.models.favorite import Favorite
from app.models.history import History
from app.models.recommendation import ListeningSession, TrackDismissal
from app.services.track_filter import is_music_track

logger = logging.getLogger(__name__)
_workers = ThreadPoolExecutor(max_workers=6, thread_name_prefix="recommendations")
_capacity = BoundedSemaphore(24)


def normalize(value):
    return " ".join(unicodedata.normalize("NFKC", value or "").casefold().split())


def artist_names(value):
    return [name.strip() for name in (value or "").split(",") if name.strip()]


def age_days(value, now):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return max(0, (now - value).total_seconds() / 86400)


def listening_weight(event):
    seconds = max(0, event.listened_seconds)
    fraction = min(1, seconds / event.duration_seconds) if event.duration_seconds else 0
    if event.outcome == "skip" and 2 <= seconds < 30 and fraction < 0.25:
        return -2.5
    if seconds < 30 and fraction < 0.5:
        return 0
    return 1.5 * min(1, seconds / 120) + 3 * fraction


@dataclass
class Profile:
    user_id: int
    artists: Counter = field(default_factory=Counter)
    artist_labels: dict = field(default_factory=dict)
    seeds: Counter = field(default_factory=Counter)
    seed_labels: dict = field(default_factory=dict)
    excluded: set = field(default_factory=set)
    dismissed: set = field(default_factory=set)
    liked: set = field(default_factory=set)
    genres: list = field(default_factory=list)


def build_profile(db, user, now=None):
    now = now or datetime.now(timezone.utc)
    profile = Profile(user.id, genres=artist_names(user.genres)[:4])

    def add_artist(value, weight):
        names = artist_names(value)
        for name in names:
            key = normalize(name)
            profile.artists[key] += weight / max(1, len(names))
            profile.artist_labels[key] = name

    for name in artist_names(user.artists):
        add_artist(name, 2)
    favorites = db.query(Favorite).filter(Favorite.owner_id == user.id).order_by(Favorite.id.desc()).limit(500).all()
    for track in favorites:
        profile.liked.add(track.video_id)
        add_artist(track.artist, 4)
        profile.seeds[track.video_id] += 3
        profile.seed_labels[track.video_id] = track.title

    events = db.query(ListeningSession).filter(ListeningSession.owner_id == user.id).order_by(ListeningSession.updated_at.desc()).limit(500).all()
    measured_ids = {event.video_id for event in events}
    for event in events:
        age = age_days(event.updated_at, now)
        weight = listening_weight(event) * 0.5 ** (age / 14)
        add_artist(event.artist, weight)
        profile.seeds[event.video_id] += weight
        profile.seed_labels[event.video_id] = event.title
        if (event.listened_seconds >= 2 and age < 1) or (weight < 0 and age < 7):
            profile.excluded.add(event.video_id)

    # Legacy starts are weak hints, never equivalent to measured listening.
    history = db.query(History).filter(History.owner_id == user.id).order_by(History.played_at.desc()).limit(200).all()
    seen = set(measured_ids)
    for track in history:
        if track.video_id in seen:
            continue
        seen.add(track.video_id)
        weight = 0.25 * 0.5 ** (age_days(track.played_at, now) / 30)
        add_artist(track.artist, weight)
        profile.seeds[track.video_id] += weight
        profile.seed_labels[track.video_id] = track.title
    profile.dismissed.update(row.video_id for row in db.query(TrackDismissal).filter(TrackDismissal.owner_id == user.id))
    profile.excluded.update(profile.dismissed)
    profile.excluded.update(profile.liked)
    profile.artists = Counter({name: max(-8, min(12, weight)) for name, weight in profile.artists.items()})
    return profile


def format_track(item):
    if not isinstance(item, dict) or not is_music_track(item):
        return None
    names = [a.get("name") for a in (item.get("artists") or []) if isinstance(a, dict) and a.get("name")]
    thumbnail = item.get("thumbnail_url") or item.get("thumbnail") or item.get("thumbnails")
    if isinstance(thumbnail, list):
        thumbnail = thumbnail[-1] if thumbnail else None
    if isinstance(thumbnail, dict):
        thumbnail = thumbnail.get("url")
    return {
        "id": item.get("videoId") or item.get("id") or item.get("video_id"),
        "title": item.get("title") or "Unknown Song",
        "artist": ", ".join(names) or item.get("artist") or "Unknown Artist",
        "thumbnail": thumbnail, "thumbnail_url": thumbnail,
        "duration": item.get("duration") or item.get("length"),
    }


class _TimedSession(requests.Session):
    def request(self, *args, **kwargs):
        kwargs["timeout"] = (3, 5)
        return super().request(*args, **kwargs)


def _fetch_source(kind, key):
    try:
        # Each worker owns its HTTP session; YTMusic sessions are not shared across threads.
        with _TimedSession() as session:
            yt = YTMusic(requests_session=session)
            if kind == "related":
                return yt.get_watch_playlist(videoId=key, limit=40, radio=True).get("tracks") or []
            if kind in ("artist", "genre"):
                return yt.search(f"{key} songs", filter="songs", limit=30) or []
            charts = yt.get_charts(country="ZZ")
            # Current ytmusicapi returns chart playlists, older versions returned songs.
            songs = (charts.get("songs") or {}).get("items") or []
            if songs:
                return songs
            playlists = charts.get("videos") or []
            if isinstance(playlists, dict):
                playlists = playlists.get("items", [])
            for playlist in playlists:
                if playlist.get("playlistId"):
                    return yt.get_playlist(playlist["playlistId"], limit=40).get("tracks") or []
            return []
    except Exception:
        logger.warning("Recommendation source unavailable: %s", kind)
        return []


@lru_cache(maxsize=256)
def _source_future(kind, key, bucket):
    if not _capacity.acquire(blocking=False):
        future = Future()
        future.set_result([])
        return future
    future = _workers.submit(_fetch_source, kind, key)
    future.add_done_callback(lambda _: _capacity.release())
    return future


def collaborative_candidates(db, profile):
    if not profile.liked:
        return []
    overlaps = db.query(Favorite.owner_id, func.count(func.distinct(Favorite.video_id))).filter(
        Favorite.video_id.in_(profile.liked), Favorite.owner_id != profile.user_id,
    ).group_by(Favorite.owner_id).order_by(func.count(func.distinct(Favorite.video_id)).desc(), Favorite.owner_id).limit(40).all()
    if not overlaps:
        return []
    counts = dict(db.query(Favorite.owner_id, func.count(func.distinct(Favorite.video_id))).filter(
        Favorite.owner_id.in_([owner for owner, _ in overlaps]),
    ).group_by(Favorite.owner_id).all())
    similarities = {
        owner: overlap / math.sqrt(len(profile.liked) * counts[owner]) * overlap / (overlap + 2)
        for owner, overlap in overlaps
    }
    scores, metadata, seen = Counter(), {}, set()
    rows = db.query(Favorite).filter(Favorite.owner_id.in_(similarities)).order_by(Favorite.owner_id, Favorite.id).limit(1500).all()
    for row in rows:
        pair = (row.owner_id, row.video_id)
        if pair in seen or row.video_id in profile.excluded:
            continue
        seen.add(pair)
        scores[row.video_id] += similarities[row.owner_id]
        metadata[row.video_id] = {name: getattr(row, name) for name in ("video_id", "title", "artist", "thumbnail_url", "duration")}
    return [(metadata[vid], "collaborative", min(5, weight * 5), "Liked by listeners with similar taste") for vid, weight in scores.most_common(100)]


def collect_candidates(db, profile, seed=None):
    jobs = []
    if seed and seed not in profile.dismissed:
        jobs.append(("related", seed, 6, "Similar to the current song"))
    for vid, weight in profile.seeds.most_common():
        if weight > 0 and vid != seed and vid not in profile.dismissed and len([job for job in jobs if job[0] == "related"]) < 3:
            jobs.append(("related", vid, 3 + min(2, weight / 4), f"Inspired by {profile.seed_labels.get(vid, 'a song you enjoy')}"))
    for artist, weight in profile.artists.most_common(3):
        if weight > 0:
            name = profile.artist_labels[artist]
            jobs.append(("artist", name, 2.5, f"More from {name}"))
    for genre in profile.genres[:2]:
        jobs.append(("genre", genre, 2, f"From your {genre} preferences"))
    jobs.append(("charts", "ZZ", 0.5, "Discover something popular"))
    jobs = [(*job, _source_future(job[0], job[1], int(time() // 300))) for job in jobs]
    # One deadline for the whole batch. Do not wait for slow workers on executor exit.
    done, _ = wait([job[-1] for job in jobs], timeout=10)
    candidates = collaborative_candidates(db, profile)
    for kind, key, weight, reason, future in jobs:
        if future not in done:
            continue
        for position, item in enumerate(future.result()):
            candidates.append((item, f"{kind}:{key}", weight / (1 + position / 30), reason))
    return candidates


def track_identity(track):
    title = re.sub(r"\s*[\[(](?:official\s+)?(?:audio|video|music video|lyrics|lyric video)[\])]", "", track["title"], flags=re.I)
    return normalize(title), normalize(artist_names(track["artist"])[0])


def rank_candidates(candidates, profile, limit=72, seed=None, exclude=()):
    blocked = profile.excluded | set(exclude) | ({seed} if seed else set())
    pooled = {}
    for raw, source, weight, reason in candidates:
        track = format_track(raw)
        if not track or track["id"] in blocked:
            continue
        entry = pooled.setdefault(track["id"], {"track": track, "sources": {}, "reason": reason, "best": -1})
        entry["sources"][source] = max(weight, entry["sources"].get(source, 0))
        if weight > entry["best"]:
            entry.update(best=weight, reason=reason)
    scored = []
    for entry in pooled.values():
        track = entry["track"]
        artists = [normalize(a) for a in artist_names(track["artist"])]
        affinity = sum(profile.artists.get(a, 0) for a in artists) / max(1, len(artists))
        score = entry["best"] + min(2, (sum(entry["sources"].values()) - entry["best"]) * 0.25)
        score += 1.8 * math.copysign(math.log1p(abs(affinity)), affinity)
        entry.update(score=score, artists=artists, unfamiliar=all(a not in profile.artists for a in artists))
        scored.append(entry)
    counts, used, result = Counter(), set(), []
    while scored and len(result) < limit:
        options = [entry for entry in scored if track_identity(entry["track"]) not in used]
        if not options:
            break
        recent = Counter(normalize(a) for track in result[-4:] for a in artist_names(track["artist"]))
        varied = [entry for entry in options if all(recent[a] < 2 for a in entry["artists"])]
        options = varied or options
        # Reserve one in five positions for a new artist, where candidates allow it.
        if len(result) % 5 == 4:
            options = [entry for entry in options if entry["unfamiliar"]] or options
        def score(entry):
            diversity_penalty = max((counts[a] for a in entry["artists"]), default=0) * 1.8
            tie = hashlib.sha256(f"{profile.user_id}:{entry['track']['id']}".encode()).hexdigest()
            return entry["score"] - diversity_penalty, tie
        chosen = max(options, key=score)
        scored.remove(chosen)
        used.add(track_identity(chosen["track"]))
        counts.update(chosen["artists"])
        result.append({**chosen["track"], "reason": chosen["reason"], "source": "hybrid"})
    return result


def recommend(db, user, limit=72, seed=None, exclude=()):
    profile = build_profile(db, user)
    return rank_candidates(collect_candidates(db, profile, seed), profile, limit, seed, exclude)
