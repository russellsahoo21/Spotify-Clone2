from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import SessionLocal
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import create_access_token, get_password_hash, verify_password
from app.utils.dependencies import get_current_user

class SocialLoginRequest(BaseModel):
    provider: str
    uid: str
    username: str
    email: str


class OnboardingRequest(BaseModel):
    genres: list[str]
    artists: list[str]

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/social-login", response_model=TokenResponse)
def social_login(payload: SocialLoginRequest, db: Session = Depends(get_db)):
    # Check if user with that email already exists
    user = db.query(User).filter(User.email == payload.email).first()
    
    if not user:
        # Check if username is already taken
        username_check = db.query(User).filter(User.username == payload.username).first()
        username = payload.username
        if username_check:
            # Append unique UID fragment to keep it unique
            username = f"{payload.username}_{payload.uid[:4]}"
            
        user = User(
            username=username,
            email=payload.email,
            password_hash=get_password_hash(f"social-login-temporary-password-{payload.uid}"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter((User.username == payload.username) | (User.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=payload.username,
        email=str(payload.email),
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@router.post("/onboarding")
def complete_onboarding(
    payload: OnboardingRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Save user onboarding preferences for genres and artists."""
    try:
        db_user = db.query(User).filter(User.id == current_user.id).first()
        db_user.genres = ",".join(payload.genres)
        db_user.artists = ",".join(payload.artists)
        db_user.onboarded = True
        db.commit()
        return {"success": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "onboarded": current_user.onboarded or False,
        "genres": current_user.genres.split(",") if current_user.genres else [],
        "artists": current_user.artists.split(",") if current_user.artists else [],
    }
