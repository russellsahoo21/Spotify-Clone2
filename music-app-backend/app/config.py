import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./music_app.db")

# Parse CORS origins safely from environment variables
raw_origins = os.getenv("CORS_ORIGINS", "*")
if not raw_origins or not raw_origins.strip():
    raw_origins = "*"
CORS_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
