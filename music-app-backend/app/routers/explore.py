from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ytmusicapi import YTMusic

from app.utils.dependencies import get_db, get_current_user
from app.routers.recommendations import feed_page
from app.services.recommendations import recommend
from app.models.user import User
from app.services.track_filter import is_music_track

router = APIRouter()
yt = YTMusic()

_explore_cache = {}
_explore_cache_time = 0

_podcasts_cache = {}
_podcasts_cache_time = 0



def get_thumbnail_url(item):
    """Safely extract thumbnail URL from ytmusicapi result item."""
    if not item:
        return None
    # Check if direct key (e.g. database column or simplified dict)
    if isinstance(item, dict):
        if item.get("thumbnail_url"):
            return item.get("thumbnail_url")
        if isinstance(item.get("thumbnail"), str) and item.get("thumbnail"):
            return item.get("thumbnail")
        
        # Try thumbnails list
        thumbnails = item.get("thumbnails")
        if thumbnails and isinstance(thumbnails, list) and len(thumbnails) > 0:
            last_item = thumbnails[-1]
            if isinstance(last_item, dict) and last_item.get("url"):
                return last_item.get("url")
            elif isinstance(last_item, str):
                return last_item
                
        # Try nested single thumbnail dict
        thumbnail = item.get("thumbnail")
        if thumbnail:
            if isinstance(thumbnail, list) and len(thumbnail) > 0:
                last_item = thumbnail[-1]
                if isinstance(last_item, dict) and last_item.get("url"):
                    return last_item.get("url")
            elif isinstance(thumbnail, dict) and thumbnail.get("url"):
                return thumbnail.get("url")
            elif isinstance(thumbnail, str):
                return thumbnail
    else:
        # It might be a SQLAlchemy model instance
        if hasattr(item, "thumbnail_url") and getattr(item, "thumbnail_url"):
            return getattr(item, "thumbnail_url")
        if hasattr(item, "thumbnail") and isinstance(getattr(item, "thumbnail"), str) and getattr(item, "thumbnail"):
            return getattr(item, "thumbnail")
    return None


@router.get("/")
def explore_home():
    """Retrieve trending songs and chart-topping tracks from YouTube Music, caching for 1 hour."""
    global _explore_cache, _explore_cache_time
    import time
    
    now = time.time()
    # Cache duration = 1 hour (3600 seconds)
    if _explore_cache and (now - _explore_cache_time < 3600):
        return _explore_cache

    def fetch_playlist_tracks(playlist_id, limit=20):
        if not playlist_id:
            return []
        try:
            res = yt.get_playlist(playlist_id, limit=limit)
            tracks = res.get("tracks", [])
            formatted = []
            for t in tracks:
                if not is_music_track(t):
                    continue
                video_id = t.get("videoId")
                if not video_id:
                    continue
                artists = ", ".join([a.get("name") for a in t.get("artists", []) if a.get("name")])
                thumbnail = get_thumbnail_url(t)
                formatted.append({
                    "id": video_id,
                    "title": t.get("title"),
                    "artist": artists,
                    "album": t.get("album", {}).get("name") if t.get("album") else None,
                    "duration": t.get("duration"),
                    "thumbnail": thumbnail,
                    "thumbnail_url": thumbnail
                })
            return formatted
        except Exception as e:
            print(f"Error fetching playlist {playlist_id}: {e}")
            return []

    try:
        # Default fallback playlist IDs
        playlists = {
            "global_songs": "PL4fGSI1pDJn6t3TXLGiiJdD-sZbrG3tG0",
            "global_trending": "PL4fGSI1pDJn6t3TXLGiiJdD-sZbrG3tG0",
            "india_trending": "OLAK5uy_lSTp1DIuzZBUyee3kDsXwPgP25WdfwB40",
            "india_songs": "OLAK5uy_lSTp1DIuzZBUyee3kDsXwPgP25WdfwB40"
        }

        # Concurrently retrieve playlist IDs dynamically if possible
        try:
            g_charts = yt.get_charts()
            videos = g_charts.get("videos", [])
            if videos and len(videos) > 0:
                playlists["global_songs"] = videos[0].get("playlistId")
                if len(videos) > 1:
                    playlists["global_trending"] = videos[1].get("playlistId")
        except Exception as e:
            print("Failed to dynamically resolve global charts playlists:", e)

        try:
            in_charts = yt.get_charts(country="IN")
            daily = in_charts.get("daily", [])
            if daily and len(daily) > 0:
                playlists["india_trending"] = daily[0].get("playlistId")
                if len(daily) > 2:
                    playlists["india_songs"] = daily[2].get("playlistId")
                elif len(daily) > 1:
                    playlists["india_songs"] = daily[1].get("playlistId")
        except Exception as e:
            print("Failed to dynamically resolve India charts playlists:", e)

        # Concurrently fetch tracks for all resolved playlists
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {name: executor.submit(fetch_playlist_tracks, pid) for name, pid in playlists.items()}
            results = {name: f.result() for name, f in futures.items()}

        result_data = {
            "trending": results.get("global_trending", []),
            "songs": results.get("global_songs", []),
            "trending_india": results.get("india_trending", []),
            "songs_india": results.get("india_songs", [])
        }
        
        # Save to cache
        _explore_cache = result_data
        _explore_cache_time = now
        
        return result_data

    except Exception as e:
        print("Failed in explore_home:", e)
        # Return fallback empty lists on critical failure
        return {
            "trending": [],
            "songs": [],
            "trending_india": [],
            "songs_india": [],
            "error": str(e)
        }


@router.get("/podcasts")
def get_explore_podcasts():
    """Retrieve popular podcast shows and episodes, caching for 1 hour."""
    global _podcasts_cache, _podcasts_cache_time
    import time
    now = time.time()
    if _podcasts_cache and (now - _podcasts_cache_time < 3600):
        return _podcasts_cache
        
    try:
        # Search for podcast shows
        shows_res = yt.search(query="TED Talks, Lex Fridman, comedy podcasts", filter="podcasts")
        shows = []
        for item in shows_res[:10]:
            playlist_id = item.get("playlistId")
            if not playlist_id:
                continue
            thumbnails = item.get("thumbnails", [])
            t_url = thumbnails[-1].get("url") if thumbnails else None
            shows.append({
                "id": playlist_id,
                "title": item.get("title"),
                "publisher": item.get("author", {}).get("name") if item.get("author") else "Podcast",
                "thumbnail": t_url,
                "thumbnail_url": t_url,
                "description": item.get("description") or "Popular podcast channel details and talk shows."
            })

        # Search for hot podcast episodes (videos filter of Lex Fridman, etc.)
        episodes_res = yt.search(query="Lex Fridman, Huberman Lab podcast episodes", filter="videos")
        episodes = []
        for item in episodes_res[:15]:
            if not is_music_track(item):
                continue
            video_id = item.get("videoId")
            if not video_id:
                continue
            artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
            t_url = get_thumbnail_url(item)
            episodes.append({
                "id": video_id,
                "title": item.get("title"),
                "artist": artists or "Podcast Host",
                "duration": item.get("duration"),
                "thumbnail": t_url,
                "thumbnail_url": t_url
            })

        result = {
            "shows": shows,
            "episodes": episodes
        }
        
        _podcasts_cache = result
        _podcasts_cache_time = now
        return result
        
    except Exception as e:
        print("Failed to fetch explore podcasts:", e)
        return {
            "shows": [],
            "episodes": [],
            "error": str(e)
        }


@router.get("/playlist-tracks")
def get_playlist_tracks(id: str):
    """Retrieve tracks of a public playlist directly from YouTube Music."""
    try:
        res = yt.get_playlist(id, limit=30)
        tracks = []
        for t in res.get("tracks", []):
            if not is_music_track(t):
                continue
            video_id = t.get("videoId")
            if not video_id:
                continue
            artists = ", ".join([a.get("name") for a in t.get("artists", []) if a.get("name")])
            t_url = get_thumbnail_url(t)
            tracks.append({
                "id": video_id,
                "title": t.get("title"),
                "artist": artists,
                "duration": t.get("duration"),
                "thumbnail": t_url,
                "thumbnail_url": t_url
            })
        return tracks
    except Exception as e:
        print("Failed to fetch public playlist tracks:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mood")
def get_mood_mix(mood: str):
    """Search for songs matching the user's mood."""
    try:
        # Search for mood-specific music mix
        results = yt.search(query=f"{mood} music", filter="songs")
        formatted_results = []
        for item in results:
            if not is_music_track(item):
                continue
            video_id = item.get("videoId")
            if not video_id:
                continue
            artists = ", ".join(
                [a.get("name") for a in item.get("artists", []) if a.get("name")]
            )
            thumbnail_url = get_thumbnail_url(item)

            formatted_results.append(
                {
                    "id": video_id,
                    "title": item.get("title"),
                    "artist": artists,
                    "album": item.get("album", {}).get("name")
                    if item.get("album")
                    else None,
                    "duration": item.get("duration"),
                    "thumbnail": thumbnail_url,
                    "thumbnail_url": thumbnail_url,
                }
            )
        return formatted_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations")
def get_personalized_recommendations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return recommend(db, current_user, limit=15)


@router.get("/infinite-feed")
def get_infinite_feed(
    page: int = Query(default=1, ge=1, le=100),
    feed_id: str | None = Query(default=None, max_length=36),
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return feed_page(db, current_user, page, feed_id, refresh)
