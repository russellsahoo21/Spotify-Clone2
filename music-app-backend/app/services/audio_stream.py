"""Resolve short-lived audio URLs without downloading or storing songs."""

import re
from functools import lru_cache
from time import time
from urllib.parse import urlparse

from yt_dlp import YoutubeDL


VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def validate_media_url(url: str) -> str:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or not (parsed.hostname or "").endswith(".googlevideo.com")
        or parsed.port not in (None, 443)
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Unsupported audio host")
    return url


@lru_cache(maxsize=128)
def _resolve(video_id: str, time_bucket: int) -> tuple[str, dict]:
    # URLs are cached briefly so byte-range requests do not repeat extraction.
    with YoutubeDL({
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 10,
        "retries": 0,
        "extractor_retries": 0,
        "js_runtimes": {"node": {}},
        "format": "bestaudio[ext=m4a][protocol=https]",
    }) as extractor:
        info = extractor.extract_info(
            f"https://www.youtube.com/watch?v={video_id}", download=False
        )
    if not info or info.get("is_live"):
        raise ValueError("No supported audio stream")
    return validate_media_url(info["url"]), {
        key: value for key, value in info.get("http_headers", {}).items()
        if key.lower() in {"user-agent", "referer", "origin"}
    }


def resolve_audio(video_id: str) -> tuple[str, dict]:
    if not VIDEO_ID.fullmatch(video_id):
        raise ValueError("Invalid video ID")
    return _resolve(video_id, int(time() // 120))
