import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.services.audio_stream import VIDEO_ID, resolve_audio, validate_media_url
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get("/stream/{video_id}")
async def stream_audio(video_id: str, request: Request, user=Depends(get_current_user)):
    if not VIDEO_ID.fullmatch(video_id):
        raise HTTPException(400, "Invalid video ID")
    byte_range = request.headers.get("range")
    if byte_range and not re.fullmatch(r"bytes=(?:\d+-\d*|-\d+)", byte_range):
        raise HTTPException(416, "Unsupported byte range")
    try:
        url, source_headers = await run_in_threadpool(resolve_audio, video_id)
    except Exception:
        raise HTTPException(502, "Audio unavailable from YouTube. Try another song.") from None

    headers = {**source_headers, "Accept-Encoding": "identity"}
    if byte_range:
        headers["Range"] = byte_range
    # Proxy on the resolving server: signed URLs can be tied to its IP address.
    client = httpx.AsyncClient(timeout=httpx.Timeout(20, connect=10), follow_redirects=False)
    upstream = None
    try:
        for _ in range(4):
            upstream = await client.send(client.build_request("GET", url, headers=headers), stream=True)
            if upstream.status_code not in (301, 302, 303, 307, 308):
                break
            location = str(upstream.url.join(upstream.headers["location"]))
            await upstream.aclose()
            url = validate_media_url(location)
        if upstream.status_code == 416:
            raise HTTPException(416, "Requested range unavailable")
        if upstream.status_code not in (200, 206):
            raise HTTPException(502, "Audio stream unavailable. Try again.")
    except Exception as error:
        if upstream is not None:
            await upstream.aclose()
        await client.aclose()
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(502, "Could not connect to audio stream.") from None

    async def body():
        try:
            async for chunk in upstream.aiter_raw():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    response_headers = {"Cache-Control": "private, no-store"}
    for name in ("content-length", "content-range", "accept-ranges"):
        if name in upstream.headers:
            response_headers[name] = upstream.headers[name]
    return StreamingResponse(
        body(), status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type", "audio/mp4"),
        headers=response_headers,
    )
