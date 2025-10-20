from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..db import get_db
from ..security import get_current_user
from ..services.achievement_checker import check_habit_achievements, check_streak_achievements

router = APIRouter(prefix="/habits", tags=["Habits"])


def _user_id(u: models.User) -> int:
    """Extract the integer user_id from the authenticated User object."""
    user_id = getattr(u, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=500, detail="Authenticated user lacks user_id")
    return user_id


class HabitCreateIn(BaseModel):
    name: Optional[str] = None
    habit_name: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[str] = None
    is_active: Optional[bool] = True

    def to_schema(self) -> schemas.HabitCreate:
        # pick whichever name field is present
        raw_name = (self.name or self.habit_name or "").strip()
        if not raw_name:
            raise HTTPException(
                status_code=422,
                detail="Provide 'name' or 'habit_name' (non-empty string).",
            )
        # normalize category
        cat = (self.category or self.category_id or "general").strip() or "general"
        # default is_active True if not provided
        active = True if self.is_active is None else bool(self.is_active)
        return schemas.HabitCreate(name=raw_name, category=cat, is_active=active)


# routes 
@router.get("/", response_model=List[schemas.HabitOut])
def list_habits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_user_habits(db, _user_id(current_user))

@router.post("/", response_model=schemas.HabitOut, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: HabitCreateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    data = payload.to_schema()
    result = crud.create_user_habit(db, data, _user_id(current_user))
    
    # Check achievements after creating habit
    check_habit_achievements(db, _user_id(current_user))
    
    return result

@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ok = crud.delete_user_habit(db, habit_id=habit_id, user_id=_user_id(current_user))
    if not ok:
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    # Check achievements after deleting habit
    check_habit_achievements(db, _user_id(current_user))
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{habit_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
def mark_complete(
    habit_id: int,
    on: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_id = _user_id(current_user)
    if not crud.get_habit(db, habit_id, user_id):
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    crud.log_habit_completion(db, habit_id, user_id, on)
    
    # Check achievements after completing habit
    check_streak_achievements(db, user_id)
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.delete("/{habit_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
def unmark_complete(
    habit_id: int,
    on: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_id = _user_id(current_user)
    if not crud.get_habit(db, habit_id, user_id):
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    crud.remove_habit_completion(db, habit_id, user_id, on)
    
    # Check achievements after uncompleting habit
    check_streak_achievements(db, user_id)
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
