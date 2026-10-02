from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import User, Favorite, History, ListeningSession, TrackDismissal
from app.routers.recommendations import feed_page, router
from app.services.recommendations import (
    Profile, _fetch_source, build_profile, collaborative_candidates,
    format_track, listening_weight, normalize, rank_candidates,
)
from app.utils.dependencies import get_current_user, get_db


def track(index, artist="Artist A", title=None):
    return {"id": f"song{index:07d}", "title": title or f"Song {index}", "artist": artist, "duration": "3:00"}


class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(username="one", email="one@example.test", password_hash="test", artists="Artist A", genres="Jazz")
        self.other = User(username="two", email="two@example.test", password_hash="test")
        self.db.add_all([self.user, self.other])
        self.db.commit()
        self.app = FastAPI()
        self.app.include_router(router, prefix="/recommendations")
        self.app.dependency_overrides[get_db] = lambda: self.db
        self.app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(self.app)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def favorite(self, user, index, artist="Artist A"):
        data = track(index, artist)
        self.db.add(Favorite(owner_id=user.id, video_id=data["id"], title=data["title"], artist=artist, duration="3:00"))
        self.db.commit()

    def test_watch_playlist_length_is_accepted(self):
        item = {"videoId": "song0000001", "title": "Music", "length": "3:07", "artists": [{"name": "Artist"}]}
        self.assertEqual(format_track(item)["duration"], "3:07")

    def test_missing_artist_metadata_does_not_break_ranking(self):
        item = {**track(1), "artists": None, "artist": None}
        result = rank_candidates([(item, "charts", 1, "Popular")], Profile(1))
        self.assertEqual(result[0]["artist"], "Unknown Artist")

    def test_seeking_to_end_is_not_a_positive_signal(self):
        event = SimpleNamespace(listened_seconds=3, duration_seconds=180, outcome="complete")
        self.assertEqual(listening_weight(event), 0)

    def test_early_skip_negative_but_long_listen_positive(self):
        self.assertLess(listening_weight(SimpleNamespace(listened_seconds=8, duration_seconds=180, outcome="skip")), 0)
        self.assertGreater(listening_weight(SimpleNamespace(listened_seconds=160, duration_seconds=180, outcome="skip")), 0)

    def test_cold_start_uses_onboarding(self):
        profile = build_profile(self.db, self.user)
        self.assertGreater(profile.artists["artist a"], 0)
        self.assertEqual(profile.genres, ["Jazz"])

    def test_user_history_is_isolated(self):
        self.favorite(self.other, 1, "Private Artist")
        self.assertNotIn("private artist", build_profile(self.db, self.user).artists)

    def test_recent_listening_outweighs_old_listening(self):
        now = datetime.now(timezone.utc)
        for index, days in [(1, 0), (2, 60)]:
            self.db.add(ListeningSession(owner_id=self.user.id, session_id=str(uuid4()), video_id=track(index)["id"],
                title=f"Song {index}", artist=f"Artist {index}", listened_seconds=180, duration_seconds=180,
                outcome="complete", updated_at=now-timedelta(days=days)))
        self.db.commit()
        profile = build_profile(self.db, self.user, now)
        self.assertGreater(profile.artists["artist 1"], profile.artists["artist 2"] * 10)
        self.assertIn(track(1)["id"], profile.excluded)
        self.assertNotIn(track(2)["id"], profile.excluded)

    def test_measured_skip_is_not_counted_again_as_legacy_positive(self):
        self.db.add(ListeningSession(owner_id=self.user.id, session_id=str(uuid4()), video_id=track(1)["id"],
            title="Skipped", artist="Skipped Artist", listened_seconds=5, duration_seconds=180, outcome="skip"))
        self.db.add(History(owner_id=self.user.id, video_id=track(1)["id"], title="Skipped", artist="Skipped Artist"))
        self.db.commit()
        profile = build_profile(self.db, self.user)
        self.assertLess(profile.artists["skipped artist"], 0)
        self.assertIn(track(1)["id"], profile.excluded)

    def test_collaborative_recommendations_use_overlap_and_exclude_own_likes(self):
        self.favorite(self.user, 1)
        self.favorite(self.other, 1)
        self.favorite(self.other, 2, "Artist B")
        profile = build_profile(self.db, self.user)
        candidates = collaborative_candidates(self.db, profile)
        self.assertEqual([c[0]["video_id"] for c in candidates], [track(2)["id"]])
        self.assertGreater(candidates[0][2], 0)

    def test_taste_changes_ranking_with_identical_candidates(self):
        candidates = [(track(1, "Artist A"), "related", 3, "Related"), (track(2, "Artist B"), "related", 3, "Related")]
        a, b = Profile(1), Profile(2)
        a.artists["artist a"] = 10
        b.artists["artist b"] = 10
        self.assertEqual(rank_candidates(candidates, a)[0]["artist"], "Artist A")
        self.assertEqual(rank_candidates(candidates, b)[0]["artist"], "Artist B")

    def test_exclusions_and_version_deduplication(self):
        profile = Profile(1, excluded={track(3)["id"]})
        candidates = [(track(1, title="Hello"), "related", 4, "Related"),
                      (track(2, title="Hello (Official Audio)"), "artist", 3, "Artist"),
                      (track(3), "charts", 10, "Charts"), (track(4), "artist", 8, "Artist")]
        result = rank_candidates(candidates, profile, seed=track(4)["id"])
        self.assertEqual([t["id"] for t in result], [track(1)["id"]])

    def test_artist_diversity_and_discovery(self):
        profile = Profile(1)
        profile.artists["artist a"] = 12
        profile.artists["artist b"] = 8
        candidates = [(track(i, "Artist A" if i < 12 else "Artist B" if i < 20 else f"New {i}"), "related", 3, "Related") for i in range(30)]
        result = rank_candidates(candidates, profile, limit=15)
        self.assertLessEqual(sum(t["artist"] == "Artist A" for t in result[:5]), 2)
        self.assertTrue(result[4]["artist"].startswith("New"))
        self.assertEqual(result, rank_candidates(candidates, profile, limit=15))

    def test_current_chart_playlist_response(self):
        with patch("app.services.recommendations.YTMusic") as yt:
            yt.return_value.get_charts.return_value = {"videos": [{"playlistId": "chart-playlist"}]}
            yt.return_value.get_playlist.return_value = {"tracks": [track(1)]}
            self.assertEqual(_fetch_source("charts", "ZZ"), [track(1)])

    def test_feed_pages_do_not_overlap_and_stay_stable(self):
        tracks = [track(i, f"Artist {i}") for i in range(30)]
        with patch("app.routers.recommendations.recommend", return_value=tracks) as recommend:
            first = feed_page(self.db, self.user, 1)
            second = feed_page(self.db, self.user, 2, first["feed_id"])
            last = feed_page(self.db, self.user, 3, first["feed_id"])
        self.assertEqual(recommend.call_count, 1)
        self.assertFalse({t["id"] for t in first["tracks"]} & {t["id"] for t in second["tracks"]})
        self.assertFalse(last["has_more"])
        with self.assertRaises(HTTPException) as error:
            feed_page(self.db, self.other, 1, first["feed_id"])
        self.assertEqual(error.exception.status_code, 410)

    def test_empty_upstream_is_retryable_not_cached_as_empty_feed(self):
        with patch("app.routers.recommendations.recommend", return_value=[]), self.assertRaises(HTTPException) as error:
            feed_page(self.db, self.user, 1)
        self.assertEqual(error.exception.status_code, 503)

    def test_dismissal_persists_is_private_and_can_be_undone(self):
        path = "/recommendations/dismissed/" + track(1)["id"]
        self.assertEqual(self.client.put(path).status_code, 200)
        self.assertEqual(self.client.put(path).status_code, 200)
        self.assertIn(track(1)["id"], build_profile(self.db, self.user).excluded)
        self.assertNotIn(track(1)["id"], build_profile(self.db, self.other).excluded)
        self.client.delete(path)
        self.assertNotIn(track(1)["id"], build_profile(self.db, self.user).excluded)

    def test_listening_is_idempotent_and_out_of_order_safe(self):
        payload = dict(session_id=str(uuid4()), video_id=track(1)["id"], title="Song", listened_seconds=8, duration_seconds=180, outcome="skip")
        self.assertEqual(self.client.post("/recommendations/listening", json=payload).status_code, 200)
        payload.update(listened_seconds=3, outcome="progress")
        self.client.post("/recommendations/listening", json=payload)
        event = self.db.query(ListeningSession).one()
        self.db.refresh(event)
        self.assertEqual(event.listened_seconds, 8)
        self.assertEqual(event.outcome, "skip")
        payload["video_id"] = track(2)["id"]
        self.assertEqual(self.client.post("/recommendations/listening", json=payload).status_code, 409)

    def test_feedback_requires_authentication_and_valid_durations(self):
        payload = dict(session_id=str(uuid4()), video_id=track(1)["id"], title="Song", listened_seconds=-1, duration_seconds=180)
        self.assertEqual(self.client.post("/recommendations/listening", json=payload).status_code, 422)
        self.app.dependency_overrides.pop(get_current_user)
        self.assertIn(self.client.get("/recommendations/dismissed").status_code, (401, 403))


if __name__ == "__main__":
    unittest.main()
