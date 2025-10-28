from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..security import create_access_token, hash_password, verify_password
from ..services.achievement_checker import (check_all_achievements,
                                            initialize_user_achievements)

router = APIRouter(prefix="/auth", tags=["auth"])


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
    return {"access_token": token, "token_type": "bearer"}
