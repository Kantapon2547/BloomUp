from typing import List
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, status, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..db import get_db
from ..security import get_current_user
from ..services.achievement_checker import check_gratitude_achievements

router = APIRouter(prefix="/gratitude", tags=["Gratitude"])

# Ensure uploads directory exists
UPLOAD_DIR = "uploads/gratitude"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload_file(file: UploadFile) -> str:
    """Save uploaded file and return the relative path."""
    try:
        if file.size > MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit")
        
        if not allowed_file(file.filename):
            raise ValueError("File type not allowed")
        
        # Generate unique filename
        ext = file.filename.rsplit(".", 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        
        # Return relative path for frontend to access via /uploads/
        return f"/uploads/gratitude/{unique_filename}"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File upload failed: {str(e)}")


@router.get("/", response_model=List[dict])
def list_gratitude_entries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all gratitude entries for the authenticated user."""
    return crud.get_user_gratitude_entries(db, current_user.user_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_gratitude_entry(
    text: str = Form(...),
    category: str = Form(""),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new gratitude entry with optional image."""
    if not text.strip():
        raise HTTPException(status_code=422, detail="Gratitude text cannot be empty")

    # Handle image upload
    image_url = None
    if file:
        image_url = save_upload_file(file)

    result = crud.create_gratitude_entry(
        db,
        user_id=current_user.user_id,
        text=text.strip(),
        category=category if category else None,
        image_url=image_url,
    )

    # Check achievements after creating entry
    check_gratitude_achievements(db, current_user.user_id)

    return result


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gratitude_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a gratitude entry and its image if exists."""
    # Get entry first to retrieve image_url for deletion
    entry = (
        db.query(models.GratitudeEntry)
        .filter(
            models.GratitudeEntry.gratitude_id == entry_id,
            models.GratitudeEntry.user_id == current_user.user_id,
        )
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404, detail="Gratitude entry not found or not owned by user"
        )

    # Delete image file if exists
    if entry.image_url:
        try:
            # Convert URL path to file path
            file_path = entry.image_url.lstrip("/")
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete image file: {e}")

    # Delete entry from database
    db.delete(entry)
    db.commit()

    # Check achievements after deleting entry
    check_gratitude_achievements(db, current_user.user_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
