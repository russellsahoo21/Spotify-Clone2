import unittest
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.stream import router
from app.services.audio_stream import resolve_audio, validate_media_url
from app.utils.dependencies import get_current_user


class AudioStreamTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api/music")
        self.app.dependency_overrides[get_current_user] = lambda: object()
        self.client = TestClient(self.app)

    def test_invalid_ids_never_reach_extractor(self):
        with patch("app.routers.stream.resolve_audio") as resolve:
            self.assertEqual(self.client.get("/api/music/stream/not-an-id").status_code, 400)
            resolve.assert_not_called()
        with self.assertRaises(ValueError):
            resolve_audio("https://example.com")

    def test_authentication_required(self):
        self.app.dependency_overrides.clear()
        self.assertIn(self.client.get("/api/music/stream/jNQXAC9IVRw").status_code, (401, 403))

    def test_host_allowlist(self):
        for url in (
            "http://rr1.googlevideo.com/audio",
            "https://googlevideo.com.evil.example/audio",
            "https://127.0.0.1/audio",
            "https://rr1.googlevideo.com:8000/audio",
            "https://user:password@rr1.googlevideo.com/audio",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_media_url(url)

    def test_multiple_ranges_rejected(self):
        with patch("app.routers.stream.resolve_audio") as resolve:
            response = self.client.get("/api/music/stream/jNQXAC9IVRw", headers={"Range": "bytes=0-1,3-4"})
            self.assertEqual(response.status_code, 416)
            resolve.assert_not_called()

    def test_upstream_error_is_sanitized(self):
        with patch("app.routers.stream.resolve_audio", side_effect=RuntimeError("secret signed URL")):
            response = self.client.get("/api/music/stream/jNQXAC9IVRw")
            self.assertEqual(response.status_code, 502)
            self.assertNotIn("secret", response.text)

    def test_seek_range_forwarded_and_audio_stream_closed(self):
        class AudioBytes(httpx.AsyncByteStream):
            async def __aiter__(self):
                yield b"data"

        def handler(request):
            self.assertEqual(request.headers["range"], "bytes=4-7")
            self.assertNotIn("authorization", request.headers)
            return httpx.Response(206, stream=AudioBytes(), headers={
                "content-type": "audio/mp4", "content-range": "bytes 4-7/20",
                "content-length": "4", "accept-ranges": "bytes",
            })
        upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        with patch("app.routers.stream.resolve_audio", return_value=("https://rr1.googlevideo.com/audio", {})), \
             patch("app.routers.stream.httpx.AsyncClient", return_value=upstream_client):
            response = self.client.get("/api/music/stream/jNQXAC9IVRw", headers={"Range": "bytes=4-7"})
        self.assertEqual(response.status_code, 206)
        self.assertEqual(response.content, b"data")
        self.assertEqual(response.headers["content-range"], "bytes 4-7/20")
        self.assertTrue(upstream_client.is_closed)

    def test_redirect_to_other_host_rejected(self):
        upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(
            lambda request: httpx.Response(302, headers={"location": "https://127.0.0.1/private"})
        ))
        with patch("app.routers.stream.resolve_audio", return_value=("https://rr1.googlevideo.com/audio", {})), \
             patch("app.routers.stream.httpx.AsyncClient", return_value=upstream_client):
            self.assertEqual(self.client.get("/api/music/stream/jNQXAC9IVRw").status_code, 502)
        self.assertTrue(upstream_client.is_closed)


if __name__ == "__main__":
    unittest.main()
