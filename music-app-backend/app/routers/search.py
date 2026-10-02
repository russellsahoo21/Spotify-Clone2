from fastapi import APIRouter, HTTPException, Query
from ytmusicapi import YTMusic
from app.services.track_filter import is_music_track

router = APIRouter()
yt = YTMusic()


@router.get("/search")
def search_music(q: str = Query(..., min_length=1)):
    """Search for songs on YouTube Music."""
    try:
        results = yt.search(query=q, filter="songs")
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
            thumbnails = item.get("thumbnails", [])
            thumbnail_url = thumbnails[-1].get("url") if thumbnails else None

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
                }
            )
        return formatted_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
