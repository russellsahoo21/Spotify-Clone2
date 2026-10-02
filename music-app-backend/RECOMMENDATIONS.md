# Recommendation engine

Home and native-app autoplay share a hybrid candidate retrieval and ranking
service. This is an explicit scoring model, not a trained neural network. The
existing public `/api/music/recommendations/{id}` endpoint remains compatible
with older clients; updated mobile autoplay uses the authenticated endpoint.

## Signals

- Onboarding artists and genres provide cold-start preferences.
- Favorites are strong positive signals. Legacy play-history entries are weak
  hints because older clients logged track selection, not confirmed listening.
- Mobile clients measure advancing playback, ignoring seeks, buffering, and
  paused time. A session sends cumulative feedback every 30 listened seconds,
  when paused, and when skipped or completed. Network errors do not mark skips.
- A skip after 2-30 seconds and below 25% completion is negative. A longer listen
  is positive, even if the user eventually skips. Listening evidence decays with
  a 14-day half-life. A completion label alone does not imply a full listen.
- "Not interested" excludes that track and removes it as a recommendation seed.
  The thumb-down button in the player toggles this preference and can undo it.

The profile reads the latest 500 listening sessions, 200 legacy history entries,
and 500 favorites. Exact recently played tracks have a one-day cooldown; early
skips have a seven-day cooldown. Likes remain accessible through the library and
are excluded from discovery results.

## Retrieval and ranking

Candidates come from up to three related-song seeds, three preferred artists,
two selected genres, global chart playlists, and other users' favorites. Similar
listeners are weighted by normalized overlap, with shrinkage for small overlap
counts. Other listeners' identities are never returned.

Ranking combines source relevance, corroboration across sources, and artist
affinity. A diversity pass discourages repeat artists, avoids more than two
appearances in a five-track window when alternatives exist, and reserves every
fifth slot for an unfamiliar artist where available. Video IDs and equivalent
official audio/video titles are deduplicated. Reasons accompany each result.

Raw public-source lookups are cached for five minutes. Six worker threads and a
24-task capacity bound upstream concurrency; each recommendation request waits
at most ten seconds for its candidate batch. Available sources survive a failure
elsewhere. HTTP calls have connection/read timeouts. Personalized rankings are
computed separately per user; no personalized response cache is shared.

## Feed and deployment

Each feed is a persisted, user-owned snapshot of up to 72 tracks, paged in groups
of 12. A snapshot lasts 30 minutes; at most three are retained per user. Refresh
builds a new ranking. New dislikes filter existing snapshots without moving
pagination offsets. Clearing history also clears listening signals and snapshots.

Deploy the backend, then the updated mobile app. Startup creates three new tables
using the existing `Base.metadata.create_all` path: `listening_sessions`,
`track_dismissals`, and `recommendation_feeds`. Existing tables and data are not
altered. Rolling back the code leaves these additive tables unused.

## Validation and limits

Backend tests use an isolated in-memory database and fake upstream results:

```powershell
cd music-app-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Playback measurement tests require Node.js 22.18+ (native TypeScript stripping):

```powershell
cd music-app-mobile
node --test tests/listening-session.test.mjs
```

These checks validate ranking behavior, feedback handling, privacy boundaries,
and pagination. They do not establish recommendation quality with real listeners.
Useful follow-up evaluation is held-out next-listen recall, early-skip rate,
completion rate, and artist coverage compared with the previous feed. Sparse
accounts rely on content and onboarding until sufficient listening/like overlap
exists. Feedback delivery is best-effort; offline events are not persisted on the
device. Background telemetry depends on the OS delivering playback updates.
