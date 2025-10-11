from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..db import get_db
from ..security import get_current_user

router = APIRouter(prefix="/gratitude", tags=["Gratitude"])


class GratitudeCreatePayload(BaseModel):
    text: str
    category: str = ""


@router.get("/", response_model=List[dict])
def list_gratitude_entries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all gratitude entries for the authenticated user."""
    return crud.get_user_gratitude_entries(db, current_user.user_id)


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_gratitude_entry(
    payload: GratitudeCreatePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new gratitude entry."""
    if not payload.text.strip():
        raise HTTPException(
            status_code=422,
            detail="Gratitude text cannot be empty"
        )
    
    return crud.create_gratitude_entry(
        db,
        user_id=current_user.user_id,
        text=payload.text.strip(),
        category=payload.category if payload.category else None,
    )


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gratitude_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a gratitude entry."""
    ok = crud.delete_gratitude_entry(db, entry_id, current_user.user_id)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail="Gratitude entry not found or not owned by user"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)