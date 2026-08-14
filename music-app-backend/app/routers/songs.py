from fastapi import APIRouter, HTTPException
from ytmusicapi import YTMusic

router = APIRouter()
yt = YTMusic()


@router.get("/recommendations/{video_id}")
def get_recommendations(video_id: str):
    """Retrieve 'Up Next' watch suggestions based on a song ID."""
    try:
        watch_playlist = yt.get_watch_playlist(videoId=video_id, limit=10)
        tracks = watch_playlist.get("tracks", [])
        formatted_tracks = []
        for track in tracks:
            track_id = track.get("videoId")
            if not track_id:
                continue
            artists = ", ".join(
                [a.get("name") for a in track.get("artists", []) if a.get("name")]
            )
            thumbnails = track.get("thumbnails") or track.get("thumbnail") or []
            thumbnail_url = thumbnails[-1].get("url") if thumbnails else None

            formatted_tracks.append(
                {
                    "id": track_id,
                    "title": track.get("title"),
                    "artist": artists,
                    "album": track.get("album", {}).get("name")
                    if track.get("album")
                    else None,
                    "duration": track.get("duration"),
                    "thumbnail": thumbnail_url,
                }
            )
        return formatted_tracks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import urllib.request
import urllib.parse
import json

def fetch_fallback_lyrics(title: str, artist: str) -> str | None:
    if not title:
        return None
    # 1. Try Lrclib API (high quality, has synced and plain lyrics)
    try:
        query = f"{title} {artist}" if artist else title
        url = f"https://lrclib.net/api/search?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and isinstance(data, list):
                for item in data:
                    lyrics = item.get("plainLyrics") or item.get("syncedLyrics")
                    if lyrics:
                        return lyrics
    except Exception as e:
        print(f"Error fetching from lrclib fallback: {e}")

    # 2. Try Lyrics.ovh API
    if artist:
        try:
            url = f"https://api.lyrics.ovh/v1/{urllib.parse.quote(artist)}/{urllib.parse.quote(title)}"
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                lyrics = data.get("lyrics")
                if lyrics:
                    return lyrics
        except Exception as e:
            print(f"Error fetching from lyrics.ovh fallback: {e}")
    return None


@router.get("/lyrics/{video_id}")
def get_lyrics(video_id: str):
    """Fetch lyrics if available for the given track."""
    try:
        watch_playlist = yt.get_watch_playlist(videoId=video_id)
        lyrics_id = watch_playlist.get("lyrics")
        if lyrics_id:
            try:
                lyrics_data = yt.get_lyrics(lyrics_id)
                native_lyrics = lyrics_data.get("lyrics", "")
                if native_lyrics:
                    return {"lyrics": native_lyrics}
            except Exception:
                pass
        
        # Fallback to search-based lookup
        title = None
        artist = None
        try:
            tracks = watch_playlist.get("tracks", [])
            if tracks:
                current_track = tracks[0]
                title = current_track.get("title")
                artists = current_track.get("artists", [])
                if artists:
                    artist = artists[0].get("name")
        except Exception:
            pass

        if not title or not artist:
            try:
                song_data = yt.get_song(videoId=video_id)
                video_details = song_data.get("videoDetails", {})
                title = video_details.get("title")
                artist = video_details.get("author")
            except Exception:
                pass

        if title:
            fallback_lyrics = fetch_fallback_lyrics(title, artist)
            if fallback_lyrics:
                return {"lyrics": fallback_lyrics}

        return {"lyrics": "Lyrics not available for this track."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
