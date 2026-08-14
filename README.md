# StreamYT - Hybrid YouTube Music Player

StreamYT is a full-stack music streaming client that combines the catalog of YouTube Music with local database capabilities. 

Because `ytmusicapi` operates as an unofficial wrapper to fetch public data directly from Google’s servers, storing user profiles, custom playlists, or play histories inside YouTube itself is complex or requires private account credentials. To solve this, StreamYT uses a **hybrid architecture**:
*   **The Global Music Catalog** (Search, track metadata, lyrics, and algorithmic recommendations) is fetched dynamically on demand from YouTube Music.
*   **The Personal App Experience** (User authentication, localized custom playlists, personal favorite markings, and play history tracking) is stored safely in a local relational database (SQLite/PostgreSQL).

---

## 1. System Architecture Diagram

```text
  ┌────────────────────────────────────────────────────────┐
  │                    React Frontend                      │
  │   - UI Components (React, Tailwind CSS, Lucide)        │
  │   - Video/Audio Player (ReactPlayer / YT IFrame SDK)   │
  └───────────────────────────┬────────────────────────────┘
                              │
                      HTTP / JSON API
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                    FastAPI Backend                     │
  │   - Routing (Search, Auth, Playlists, Library, Sync)   │
  │   - Database Session & JWT Middleware Dependencies     │
  └─────────────┬────────────────────────────┬─────────────┘
                │                            │
      Local DB Operations          External HTTP Requests
                ▼                            ▼
  ┌───────────────────────────┐┌───────────────────────────┐
  │    SQLite / PostgreSQL    ││    YouTube Music API      │
  │  - User Accounts (Auth)   ││  - ytmusicapi Python lib  │
  │  - Local Playlists        ││  - Fetch Track Details    │
  │  - Favorites & History    ││  - Grab Lyrics & Recommendations
  └───────────────────────────┘└───────────────────────────┘


  music-app/
│
├── music-app-backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # Server entrypoint (initializes app, middleware, & routes)
│   │   ├── config.py                # Environment configuration (JWT secrets, DB URLs)
│   │   ├── database.py              # SQLAlchemy engine & session local configuration
│   │   │
│   │   ├── models/                  # SQLAlchemy tables (Database layer)
│   │   │   ├── __init__.py
│   │   │   ├── user.py              # User profiles & credentials
│   │   │   ├── playlist.py          # Local playlists & intermediate track associations
│   │   │   ├── favorite.py          # Bookmarked tracks, albums, and artists
│   │   │   └── history.py           # Listening history logs
│   │   │
│   │   ├── schemas/                 # Pydantic models (Input & output validations)
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Login/registration payloads & JWT schemas
│   │   │   ├── music.py             # Standardized representation of Track, Album, Artist objects
│   │   │   ├── playlist.py          # Playlist validation (creation and updates)
│   │   │   └── user.py              # User profiles output
│   │   │
│   │   ├── routers/                 # API endpoint routers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Authentication flow (Register, Login, Token refresh)
│   │   │   ├── search.py            # Global Search (delegated to ytmusicapi)
│   │   │   ├── songs.py             # Specific song data (lyrics, audio-linking)
│   │   │   ├── playlists.py         # Local playlist CRUD (write/read from local DB)
│   │   │   ├── library.py           # Listening history & Favorites manager
│   │   │   ├── explore.py           # Home screen charts, categories, and suggestions
│   │   │   └── youtube_sync.py      # Optional module to connect official Google accounts
│   │   │
│   │   ├── services/                # Business logic wrappers
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py      # Secure password hashing (bcrypt) & JWT operations
│   │   │   └── ytmusic_service.py   # Maps raw ytmusicapi lists/payloads to standardized schemas
│   │   │
│   │   └── utils/                   # General auxiliary helpers
│   │       ├── __init__.py
│   │       └── dependencies.py      # Middleware checking database instances and current users
│   │
│   ├── requirements.txt             # Backend dependencies list
│   └── .env                         # Secret environment file (JWT key, Database URI)
│
└── music-app-frontend/
    ├── src/
    │   ├── assets/                  # Local media assets and images
    │   ├── components/              # UI widgets (Sidebar, SearchBar, TrackRow, Layout, MiniPlayer)
    │   ├── context/                 # Global React context (AudioContext, AuthContext)
    │   ├── views/                   # Full-page views (Home, Library, PlaylistDetails, SearchResults)
    │   ├── App.jsx                  # Main interface routing and structure
    │   ├── index.css                # Global styles (Tailwind configs)
    │   └── main.jsx                 # Entrypoint
    │
    ├── package.json                 # Frontend build dependencies
    ├── tailwind.config.js           # CSS customization configuration
    └── vite.config.js               # Build configurations


3. Core Features

👤 Authentication & Session Security
Secure registration and login with local accounts.
State-persistent sessions via JSON Web Tokens (JWT) stored safely in cookies or storage.
🔍 Search & Metadata Retrieval
Instant, global catalog queries filtering by songs, albums, artists, or playlists.
Direct fetch of official lyrics and album artwork matching the tracked song.
🎼 Automated Dynamic Recommendations
Generates a reactive "Up Next" queue as soon as a track starts.
Leverages YouTube Music's watch playlist algorithms to provide relative track lists.
💾 Local Libraries & Custom Playlists
Add public tracks to custom playlists stored locally, without requiring a Google/YouTube account.
Quick bookmarks for liking songs and building out a personal catalog.
A "Recently Played" list that builds automatically based on play history logs.
4. API Endpoint Definitions
Authentication Routes (/api/auth)
POST /register: Registers a new user. Hash passwords via Bcrypt.
POST /login: Validates password and issues a short-term bearer access JWT.
GET /me: Returns the currently authenticated user details.
Music & Cloud Discovery (/api/music)
GET /search?q={query}: Searches YouTube Music via ytmusicapi using a public interface.
GET /songs/{video_id}/lyrics: Pulls available lyrics via corresponding IDs.
GET /songs/{video_id}/recommendations: Returns dynamic recommendations related to the selected item.
Playlist Management (/api/playlists)
POST /: Creates a new local custom playlist.
GET /: Fetches all custom playlists owned by the authenticated user.
PUT /{playlist_id}: Edits playlist properties (title, description, cover style).
POST /{playlist_id}/tracks: Adds a track (title, artist, thumbnail URL, and videoId) to a playlist.
DELETE /{playlist_id}/tracks/{track_id}: Removes a track from a playlist.
DELETE /{playlist_id}: Deletes a local playlist entirely.
User Catalog & Library (/api/library)
GET /history: Returns the user's chronological playback history.
POST /history: Logs a new playback history entry.
GET /favorites: Retrieves all bookmarked tracks.
POST /favorites: Adds a track to the user's favorites.
DELETE /favorites/{video_id}: Removes a track from favorites.
5. Setup & Installation
Backend Setup (FastAPI)
Navigate to the backend directory:
code
Bash
cd music-app-backend
Create and activate a Python virtual environment:
code
Bash
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
Install required packages:
code
Bash
pip install -r requirements.txt
Create a .env file in the root of the backend folder:
code
Env
SECRET_KEY="your-super-secret-jwt-signing-key"
ALGORITHM="HS256"
DATABASE_URL="sqlite:///./music_app.db"
Run the development server:
code
Bash
python app/main.py
The backend should now be running at http://localhost:8000.
Frontend Setup (Vite + React)
Navigate to the frontend directory:
code
Bash
cd music-app-frontend
Install package dependencies:
code
Bash
npm install
Boot the React server:
code
Bash
npm run dev
Open the local URL (usually http://localhost:5173) in your web browser.
6. Project Caveats & Development Disclaimers
Scraping Limitations: This app relies on the ytmusicapi Python wrapper. Because it acts as an unofficial client, changes to YouTube Music's web interfaces can occasionally cause errors. Keep your package updated to resolve parsing bugs quickly.
Rate Limits: Avoid spamming repeated heavy requests from the same IP address. High-frequency queries may prompt Google to temporarily rate-limit or issue recaptchas to your host IP.
YT IFrame Constraints: Playing back content relies on embedding the YouTube IFrame API via react-player. To ensure compatibility with YouTube's Terms of Service and API constraints, keep the player visual container at least partially visible on the page. Completely hiding or stripping the iframe can prevent browsers from autoplaying audio.
code
Code
***

### Ready to proceed?
We can now start implementing this architecture. Let me know if you would like to build **Step 1: Database Setup and Authentication (FastAPI, SQLAlchemy, and JWT)**, or jump directly into **Step 2: Core Music Service (implementing the Search, Lyrics, and Recommendation service endpoints)**.