from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ytmusicapi import YTMusic

from app.utils.dependencies import get_db, get_current_user
from app.models.favorite import Favorite
from app.models.history import History
from app.models.user import User

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
    """Retrieve personalized recommendations for the user based on history and favorites."""
    try:
        recommendations = []
        seen_ids = set()

        # 1. Fetch user's favorites and recent history
        user_favorites = db.query(Favorite).filter(Favorite.owner_id == current_user.id).all()
        user_history = db.query(History).filter(History.owner_id == current_user.id).order_by(History.played_at.desc()).limit(20).all()

        # Build list of already seen / liked video IDs so we don't recommend them again immediately
        liked_ids = {f.video_id for f in user_favorites}
        played_ids = {h.video_id for h in user_history}
        exclude_ids = liked_ids.union(played_ids)

        # 2. SQL-based Collaborative Filtering
        if user_favorites:
            fav_video_ids = [f.video_id for f in user_favorites]
            
            # Find other owners who liked the same songs
            other_owners = list(set(f[0] for f in db.query(Favorite.owner_id).filter(
                Favorite.video_id.in_(fav_video_ids), 
                Favorite.owner_id != current_user.id
            ).all()))
            
            if other_owners:
                collaborative_candidates = (
                    db.query(Favorite.video_id, Favorite.title, Favorite.artist, Favorite.thumbnail_url, Favorite.duration)
                    .filter(
                        Favorite.owner_id.in_(other_owners),
                        ~Favorite.video_id.in_(exclude_ids)
                    )
                    .limit(10)
                    .all()
                )
                for cand in collaborative_candidates:
                    vid_id = cand.video_id
                    if vid_id not in seen_ids:
                        seen_ids.add(vid_id)
                        t_url = get_thumbnail_url(cand)
                        recommendations.append({
                            "id": vid_id,
                            "title": cand.title,
                            "artist": cand.artist,
                            "thumbnail": t_url,
                            "thumbnail_url": t_url,
                            "duration": cand.duration,
                            "source": "collaborative"
                        })

        # 3. Artist-based Content Recommendation (via YouTube Music)
        artist_counts = {}
        for item in user_favorites + user_history:
            if item.artist:
                artists = [a.strip() for a in item.artist.split(",")]
                for artist in artists:
                    artist_counts[artist] = artist_counts.get(artist, 0) + 1

        top_artists = sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:3]

        for artist, _ in top_artists:
            try:
                # Search for popular songs of this artist on YTM
                search_results = yt.search(query=f"{artist} songs", filter="songs")
                count = 0
                for item in search_results:
                    video_id = item.get("videoId")
                    if not video_id or video_id in exclude_ids or video_id in seen_ids:
                        continue
                    
                    artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                    t_url = get_thumbnail_url(item)

                    seen_ids.add(video_id)
                    recommendations.append({
                        "id": video_id,
                        "title": item.get("title"),
                        "artist": artists,
                        "thumbnail": t_url,
                        "thumbnail_url": t_url,
                        "duration": item.get("duration"),
                        "source": f"artist ({artist})"
                    })
                    count += 1
                    if count >= 3:
                        break
            except Exception as e:
                print(f"Error fetching artist recommendations for {artist}: {e}")

        # 4. Recent-track algorithm fallback (via YouTube Music Watch Playlist)
        if user_history and len(recommendations) < 15:
            recent_video_id = user_history[0].video_id
            try:
                watch_playlist = yt.get_watch_playlist(videoId=recent_video_id, limit=10)
                tracks = watch_playlist.get("tracks", [])
                count = 0
                for track in tracks:
                    track_id = track.get("videoId")
                    if not track_id or track_id in exclude_ids or track_id in seen_ids:
                        continue
                    
                    artists = ", ".join([a.get("name") for a in track.get("artists", []) if a.get("name")])
                    t_url = get_thumbnail_url(track)

                    seen_ids.add(track_id)
                    recommendations.append({
                        "id": track_id,
                        "title": track.get("title"),
                        "artist": artists,
                        "thumbnail": t_url,
                        "thumbnail_url": t_url,
                        "duration": track.get("duration"),
                        "source": "similar to recent"
                    })
                    count += 1
                    if len(recommendations) >= 15 or count >= 5:
                        break
            except Exception as e:
                print(f"Error fetching watch playlist recommendations: {e}")

        # 5. Default fallback (Charts/Trending)
        if len(recommendations) < 10:
            try:
                charts = yt.get_charts()
                raw_songs = charts.get("songs", {}).get("items", [])
                for song in raw_songs:
                    video_id = song.get("videoId")
                    if not video_id or video_id in exclude_ids or video_id in seen_ids:
                        continue
                    
                    artists = ", ".join([a.get("name") for a in song.get("artists", []) if a.get("name")])
                    t_url = get_thumbnail_url(song)

                    seen_ids.add(video_id)
                    recommendations.append({
                        "id": video_id,
                        "title": song.get("title"),
                        "artist": artists,
                        "thumbnail": t_url,
                        "thumbnail_url": t_url,
                        "duration": song.get("duration"),
                        "source": "trending"
                    })
                    if len(recommendations) >= 15:
                        break
            except Exception as e:
                print(f"Error fetching fallback recommendations from charts: {e}")

        return recommendations[:15]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/infinite-feed")
def get_infinite_feed(
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve dynamic page of infinite recommendations with layout metadata."""
    try:
        # Get user context
        user_favorites = db.query(Favorite).filter(Favorite.owner_id == current_user.id).all()
        user_history = db.query(History).filter(History.owner_id == current_user.id).order_by(History.played_at.desc()).limit(20).all()
        
        # Helper to avoid duplicates
        exclude_ids = {f.video_id for f in user_favorites}.union({h.video_id for h in user_history})
        
        # Parallel thread pool executor
        user_artists = current_user.artists.split(",") if current_user.artists else []
        with ThreadPoolExecutor(max_workers=5) as executor:
            if page == 1:
                # Page 1: Carousel layout with personalized recommendations
                future_recent = None
                if user_history:
                    future_recent = executor.submit(yt.get_watch_playlist, videoId=user_history[0].video_id, limit=12)
                
                future_artists = []
                if user_artists:
                    # Search tracks for the first 3 favorite artists in parallel
                    for artist in user_artists[:3]:
                        future_artists.append(
                            executor.submit(yt.search, query=f"{artist} songs", filter="songs")
                        )
                
                future_charts = executor.submit(yt.get_charts)
                
                tracks = []
                seen_ids = set()
                
                # 1. Fetch recent tracks
                if future_recent:
                    try:
                        res = future_recent.result(timeout=4.0)
                        for track in res.get("tracks", []):
                            track_id = track.get("videoId")
                            if track_id and track_id not in seen_ids:
                                seen_ids.add(track_id)
                                artists = ", ".join([a.get("name") for a in track.get("artists", []) if a.get("name")])
                                t_url = get_thumbnail_url(track)
                                tracks.append({
                                    "id": track_id,
                                    "title": track.get("title"),
                                    "artist": artists,
                                    "thumbnail": t_url,
                                    "thumbnail_url": t_url,
                                    "duration": track.get("duration")
                                })
                    except Exception:
                        pass
                
                # 2. Fetch onboarding favorite artists tracks
                for fut in future_artists:
                    try:
                        res = fut.result(timeout=4.0)
                        # Take up to 5 tracks per artist to keep recommendations diverse
                        for item in res[:5]:
                            track_id = item.get("videoId")
                            if track_id and track_id not in seen_ids:
                                seen_ids.add(track_id)
                                artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                                t_url = get_thumbnail_url(item)
                                tracks.append({
                                    "id": track_id,
                                    "title": item.get("title"),
                                    "artist": artists or "Unknown Artist",
                                    "thumbnail": t_url,
                                    "thumbnail_url": t_url,
                                    "duration": item.get("duration")
                                })
                    except Exception:
                        pass
                
                # 3. Fetch charts fallback to fill remaining slots (up to 20 tracks total)
                try:
                    res = future_charts.result(timeout=4.0)
                    for song in res.get("songs", {}).get("items", []):
                        track_id = song.get("videoId")
                        if track_id and track_id not in seen_ids and len(tracks) < 20:
                            seen_ids.add(track_id)
                            artists = ", ".join([a.get("name") for a in song.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(song)
                            tracks.append({
                                "id": track_id,
                                "title": song.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": song.get("duration")
                              })
                except Exception:
                    pass
                
                return {
                    "title": "Recommended for Today",
                    "layout": "carousel",
                    "tracks": tracks[:20]
                }
                
            elif page == 2:
                # Page 2: Quick Picks layout inspired by user's top artist
                artist_counts = {}
                for item in user_favorites + user_history:
                    if item.artist:
                        for art in [a.strip() for a in item.artist.split(",")]:
                            artist_counts[art] = artist_counts.get(art, 0) + 1
                
                top_artists = sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)
                target_artist = top_artists[0][0] if top_artists else (user_artists[0] if user_artists else "Arijit Singh")
                
                # Fetch artist tracks
                future_search = executor.submit(yt.search, query=f"{target_artist} songs", filter="songs")
                try:
                    results = future_search.result(timeout=4.0)
                    tracks = []
                    for item in results:
                        video_id = item.get("videoId")
                        if video_id:
                            artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(item)
                            tracks.append({
                                "id": video_id,
                                "title": item.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": item.get("duration")
                            })
                    return {
                        "title": f"Quick Picks: Inspired by {target_artist}",
                        "layout": "quick-picks",
                        "tracks": tracks[:12]
                    }
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
                    
            elif page == 3:
                # Page 3: Spotlight layout (featuring one big track on the left, 4 on the right)
                target_video_id = user_favorites[0].video_id if user_favorites else (user_history[0].video_id if user_history else "dQw4w9WgXcQ")
                target_title = user_favorites[0].title if user_favorites else (user_history[0].title if user_history else "Never Gonna Give You Up")
                
                future_watch = executor.submit(yt.get_watch_playlist, videoId=target_video_id, limit=8)
                try:
                    res = future_watch.result(timeout=4.0)
                    tracks = []
                    for track in res.get("tracks", []):
                        track_id = track.get("videoId")
                        if track_id:
                            artists = ", ".join([a.get("name") for a in track.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(track)
                            tracks.append({
                                "id": track_id,
                                "title": track.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": track.get("duration")
                            })
                    return {
                        "title": f"Spotlight: Inspired by '{target_title}'",
                        "layout": "spotlight",
                        "tracks": tracks[:6]
                    }
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
                    
            elif page == 4:
                # Page 4: Carousel layout with workout/energy mix
                future_search = executor.submit(yt.search, query="Workout Energy music", filter="songs")
                try:
                    results = future_search.result(timeout=4.0)
                    tracks = []
                    for item in results:
                        video_id = item.get("videoId")
                        if video_id:
                            artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(item)
                            tracks.append({
                                "id": video_id,
                                "title": item.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": item.get("duration")
                            })
                    return {
                        "title": "Workout Energy Mix",
                        "layout": "carousel",
                        "tracks": tracks[:15]
                    }
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
                    
            elif page == 5:
                # Page 5: Spotlight layout with secondary favorite artist
                artist_counts = {}
                for item in user_favorites + user_history:
                    if item.artist:
                        for art in [a.strip() for a in item.artist.split(",")]:
                            artist_counts[art] = artist_counts.get(art, 0) + 1
                
                top_artists = sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)
                target_artist = top_artists[1][0] if len(top_artists) > 1 else (user_artists[1] if len(user_artists) > 1 else (top_artists[0][0] if top_artists else (user_artists[0] if user_artists else "Lata Mangeshkar")))
                
                future_search = executor.submit(yt.search, query=f"{target_artist} top hits", filter="songs")
                try:
                    results = future_search.result(timeout=4.0)
                    tracks = []
                    for item in results:
                        video_id = item.get("videoId")
                        if video_id:
                            artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(item)
                            tracks.append({
                                "id": video_id,
                                "title": item.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": item.get("duration")
                            })
                    return {
                        "title": f"Spotlight: Top Hits of {target_artist}",
                        "layout": "spotlight",
                        "tracks": tracks[:6]
                    }
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
            
            else:
                # Fallback pages: cycle through dynamic mood mixes
                moods = ["Party", "Romance", "Relaxing", "Commute", "Feel Good"]
                selected_mood = moods[page % len(moods)]
                future_search = executor.submit(yt.search, query=f"{selected_mood} music mix", filter="songs")
                try:
                    results = future_search.result()
                    tracks = []
                    for item in results:
                        video_id = item.get("videoId")
                        if video_id:
                            artists = ", ".join([a.get("name") for a in item.get("artists", []) if a.get("name")])
                            t_url = get_thumbnail_url(item)
                            tracks.append({
                                "id": video_id,
                                "title": item.get("title"),
                                "artist": artists,
                                "thumbnail": t_url,
                                "thumbnail_url": t_url,
                                "duration": item.get("duration")
                            })
                    layouts = ["carousel", "quick-picks", "spotlight"]
                    selected_layout = layouts[page % len(layouts)]
                    return {
                        "title": f"{selected_mood} Vibe Mix",
                        "layout": selected_layout,
                        "tracks": tracks[:15]
                    }
                except Exception as e:
                    raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
