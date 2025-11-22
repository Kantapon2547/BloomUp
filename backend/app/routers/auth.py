from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import os

from .. import models, schemas
from ..db import get_db
from ..security import create_access_token, hash_password, verify_password
from ..services.achievement_checker import (
    check_all_achievements,
    initialize_user_achievements,
)

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Default categories
DEFAULT_CATEGORIES = [
    {"name": "General", "color": "#ede9ff"},
    {"name": "Study", "color": "#fff4cc"},
    {"name": "Health", "color": "#e9fcef"},
    {"name": "Mind", "color": "#fbefff"},
]

def create_default_categories(db: Session, user_id: int):
    for cat in DEFAULT_CATEGORIES:
        category = models.HabitCategory(
            user_id=user_id,
            category_name=cat["name"],
            color=cat["color"],
        )
        db.add(category)
    db.commit()

@router.post("/signup", response_model=schemas.UserOut)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = models.User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
        bio=payload.bio,
        profile_picture=payload.profile_picture,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default categories for new user
    create_default_categories(db, user.user_id)

    # Initialize achievements for new user
    initialize_user_achievements(db, user.user_id)

    # Check all achievements to calculate initial progress
    check_all_achievements(db, user.user_id)

    return user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(subject=user.email)
    return {"token": token, "token_type": "bearer"}

@router.post("/google-login", response_model=schemas.Token)
def google_login(payload: dict, db: Session = Depends(get_db)):
    """
    Google login endpoint. Expects: { "token": "<google_id_token>" }
    Creates user if doesn't exist, otherwise returns existing user's token.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
    
    try:
        # Verify the Google token
        id_info = id_token.verify_oauth2_token(
            payload.get("token"), 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user info from token
        email = id_info.get("email")
        name = id_info.get("name", "")
        picture = id_info.get("picture", "")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            # Create new user from Google profile
            user = models.User(
                email=email,
                name=name,
                password_hash=hash_password(os.urandom(32).hex()),  # Random password
                profile_picture=picture,
                bio="",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create default categories for new Google user
            create_default_categories(db, user.user_id)
            
            # Initialize achievements for new user
            initialize_user_achievements(db, user.user_id)
            check_all_achievements(db, user.user_id)
        
        # Create access token
        token = create_access_token(subject=user.email)
        return {"token": token, "token_type": "bearer"}
    
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
    