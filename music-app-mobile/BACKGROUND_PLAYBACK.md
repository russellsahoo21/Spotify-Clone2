# Background playback

Native Android/iOS Song mode uses expo-audio and the authenticated backend
`GET /api/music/stream/{video_id}` endpoint. Search and recommendations still use
ytmusicapi. Video mode and web playback still use the YouTube iframe and do not
provide reliable screen-off playback.

## Deploy together

1. Update the backend and install `music-app-backend/requirements.txt`.
2. Make Node.js 22 or newer available on the backend PATH. yt-dlp uses Node and
   its installed `yt-dlp-ejs` package to resolve YouTube streams.
3. Run the full backend entry point `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   from `music-app-backend`, not the legacy root `main.py`.
4. Build and install a new native app with `eas build --platform android --profile preview`.
   An OTA update or the previous APK does not include the new native audio module.

The app defaults to `https://spotify-clone2-k28a.onrender.com/api`; a different
backend requires `EXPO_PUBLIC_API_URL` at build time. The deployed backend must
include the stream endpoint before testing Song mode.

Audio is relayed through the backend because signed media URLs may depend on the
server IP. This adds bandwidth and concurrent connections to the hosting service.
The endpoint requires app authentication, supports byte ranges for seeking, and
does not save audio files. YouTube may reject requests from a hosting provider;
successful local playback does not prove that Render can resolve the same audio.
Failures show a retry message; Video mode remains available.

## Device verification

- Play a song, lock the phone for at least three minutes, and confirm audio continues.
- Pause/resume from the notification, lock screen, and headset controls.
- Seek, skip, repeat one track, and let the queue advance with the screen locked.
- Switch Song/Video modes and confirm there is no double audio.
- Test a phone call, headphones disconnecting, and an unavailable song.
- Confirm sleep timer expiry while backgrounded and on return to the app.

Track transitions and the sleep timer still involve JavaScript. Verify these on
physical devices, especially iOS where the OS may suspend JavaScript timers.
Force-stopping the app is not supported as continuous playback.
