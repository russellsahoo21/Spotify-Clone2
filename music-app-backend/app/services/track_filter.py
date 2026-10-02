import re
from typing import Any


AD_TEXT_RE = re.compile(
    r"\b("
    r"ad|ads|advert|advertisement|sponsored|sponsor|promo|promoted|commercial|"
    r"yt\s*ad|youtube\s*ad|skip\s*ad|includes\s*paid\s*promotion"
    r")\b",
    re.IGNORECASE,
)

MUSIC_DURATION_RE = re.compile(r"^\d{1,2}:\d{2}(?::\d{2})?$")


def is_music_track(item: dict[str, Any] | None) -> bool:
    if not item:
        return False

    video_id = item.get("videoId") or item.get("id") or item.get("video_id")
    if not video_id:
        return False

    duration = item.get("duration") or item.get("length")
    if not duration or not MUSIC_DURATION_RE.match(str(duration)):
        return False

    text_parts: list[str] = [
        str(item.get("title") or ""),
        str(item.get("description") or ""),
        str(item.get("artist") or ""),
        str(item.get("author") or ""),
    ]

    for artist in item.get("artists") or []:
        if isinstance(artist, dict):
            text_parts.append(str(artist.get("name") or ""))

    if AD_TEXT_RE.search(" ".join(text_parts)):
        return False

    return True


def filter_music_tracks(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in items if is_music_track(item)]
