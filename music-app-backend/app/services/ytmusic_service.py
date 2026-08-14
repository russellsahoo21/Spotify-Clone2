from app.schemas.music import Track


def normalize_track(raw: dict) -> Track:
    return Track(
        video_id=raw.get("videoId", ""),
        title=raw.get("title", "Untitled"),
        artist=raw.get("artist"),
        thumbnail_url=raw.get("thumbnailUrl"),
        duration=raw.get("duration"),
    )
