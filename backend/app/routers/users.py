from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os, shutil
from uuid import uuid4

from .. import schemas, models
from ..db import get_db
from ..security import get_current_email, hash_password

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=schemas.UserOut)
def read_me(db: Session = Depends(get_db), email: str = Depends(get_current_email)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=schemas.UserOut)
def update_me(patch: schemas.UserUpdate, db: Session = Depends(get_db), email: str = Depends(get_current_email)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if patch.name is not None: user.name = patch.name
    if patch.bio is not None: user.bio = patch.bio
    if patch.profile_picture is not None: user.profile_picture = patch.profile_picture
    if patch.password: user.password_hash = hash_password(patch.password)

    db.commit()
    db.refresh(user)
    return user

# Avatar upload
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
UPLOAD_DIR = "uploads"

@router.post("/me/avatar", response_model=schemas.UserOut)
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), email: str = Depends(get_current_email)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    fname = f"{uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, fname)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.profile_picture = f"{BACKEND_BASE_URL}/uploads/{fname}"
    db.commit()
    db.refresh(user)
    return user