from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..security import hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def signup(payload: schemas.UserCreate, db: Session = Depends(get_db)):

    # Passwords checking
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    # check unique email or not??
    exists = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user
    user = models.User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
