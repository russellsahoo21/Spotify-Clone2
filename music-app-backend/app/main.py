import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, engine
from app.routers import auth, explore, library, playlists, recommendations, search, songs, stream, youtube_sync

app = FastAPI(title="StreamYT Unified API Gateway")

# Enable CORS for React frontend development and production
# allow_credentials cannot be True if allow_origins contains "*"
allow_credentials = "*" not in CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables (SQLite)
Base.metadata.create_all(bind=engine)

# Startup migration: add onboarding fields to users table if they don't exist
from sqlalchemy import text
try:
    with engine.connect() as conn:
        try:
            conn.execute(text("SELECT onboarded FROM users LIMIT 1"))
        except Exception:
            # Table doesn't have the columns, add them
            conn.execute(text("ALTER TABLE users ADD COLUMN onboarded BOOLEAN DEFAULT 0"))
            conn.execute(text("ALTER TABLE users ADD COLUMN genres VARCHAR(550)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN artists VARCHAR(950)"))
            conn.commit()
except Exception as e:
    print(f"Startup migration warning: {e}")

# Mount API routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(search.router, prefix="/api/music", tags=["music"])
app.include_router(songs.router, prefix="/api/music", tags=["songs"])
app.include_router(stream.router, prefix="/api/music", tags=["stream"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(playlists.router, prefix="/api/playlists", tags=["playlists"])
app.include_router(library.router, prefix="/api/library", tags=["library"])
app.include_router(explore.router, prefix="/api/explore", tags=["explore"])
app.include_router(youtube_sync.router, prefix="/api/youtube", tags=["youtube"])


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
