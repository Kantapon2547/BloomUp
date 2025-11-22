from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from .. import crud, models, schemas
from ..db import get_db
from ..security import get_current_user
from ..services.achievement_checker import (
    check_habit_achievements,
    check_streak_achievements,
)

router = APIRouter(prefix="/habits", tags=["Habits"])


def _user_id(u: models.User) -> int:
    """Extract the integer user_id from the authenticated User object."""
    user_id = getattr(u, "user_id", None)
    if user_id is None:
        raise HTTPException(status_code=500, detail="Authenticated user lacks user_id")
    return user_id

def calculate_session_status(actual_duration: int, planned_duration: int) -> str:
    """
    Calculate session status based on actual vs planned duration.
    - 'todo': not started (actual == 0)
    - 'in_progress': currently running (0 < actual < planned)
    - 'done': completed (actual >= planned)
    """
    if actual_duration == 0:
        return "todo"
    elif actual_duration >= planned_duration:
        return "done"
    else:
        return "in_progress"


# Category Routes
@router.get("/categories", response_model=List[schemas.HabitCategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all categories for the authenticated user"""
    user_id = _user_id(current_user)
    categories = (
        db.query(models.HabitCategory)
        .filter(models.HabitCategory.user_id == user_id)
        .order_by(models.HabitCategory.category_name)
        .all()
    )
    return categories


@router.post("/categories", response_model=schemas.HabitCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: schemas.HabitCategoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new category"""
    user_id = _user_id(current_user)
    
    # Check if category already exists
    existing = (
        db.query(models.HabitCategory)
        .filter(
            models.HabitCategory.user_id == user_id,
            models.HabitCategory.category_name == payload.category_name,
        )
        .first()
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category = models.HabitCategory(
        user_id=user_id,
        category_name=payload.category_name,
        color=payload.color,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=schemas.HabitCategoryOut)
def update_category(
    category_id: int,
    payload: schemas.HabitCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a category"""
    user_id = _user_id(current_user)
    
    category = (
        db.query(models.HabitCategory)
        .filter(
            models.HabitCategory.category_id == category_id,
            models.HabitCategory.user_id == user_id,
        )
        .first()
    )
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    if payload.category_name is not None:
        category.category_name = payload.category_name
    if payload.color is not None:
        category.color = payload.color
    
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a category"""
    user_id = _user_id(current_user)
    
    category = (
        db.query(models.HabitCategory)
        .filter(
            models.HabitCategory.category_id == category_id,
            models.HabitCategory.user_id == user_id,
        )
        .first()
    )
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Soft delete - set habit categories to NULL
    db.query(models.Habit).filter(
        models.Habit.category_id == category_id
    ).update({"category_id": None})
    
    db.delete(category)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Habit Routes
@router.get("/", response_model=List[schemas.HabitOut])
def list_habits(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all habits for the authenticated user with categories and sessions"""
    user_id = _user_id(current_user)
    
    # Use joinedload to eagerly load category
    habits = (
        db.query(models.Habit)
        .options(
            joinedload(models.Habit.category),  
            joinedload(models.Habit.completions),  
            joinedload(models.Habit.sessions),  
        )
        .filter(models.Habit.user_id == user_id)
        .order_by(models.Habit.habit_id.asc())
        .all()
    )
    
    return [_build_habit_response(h) for h in habits]


@router.post("/", response_model=schemas.HabitOut, status_code=status.HTTP_201_CREATED)
def create_habit(
    payload: schemas.HabitCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new habit"""
    user_id = _user_id(current_user)
    
    # If no category provided, use "General" category
    category_id = payload.category_id
    
    if category_id is None:
        # Find the "General" category 
        general_category = (
            db.query(models.HabitCategory)
            .filter(
                models.HabitCategory.user_id == user_id,
                models.HabitCategory.category_name == "General",
            )
            .first()
        )
        
        if general_category:
            category_id = general_category.category_id
        else:
            # If no "General" category exists, create one
            general_category = models.HabitCategory(
                user_id=user_id,
                category_name="General",
                color="#ede9ff",
            )
            db.add(general_category)
            db.commit()
            db.refresh(general_category)
            category_id = general_category.category_id
    else:
        # Validate that the category belongs to this user
        category = (
            db.query(models.HabitCategory)
            .filter(
                models.HabitCategory.category_id == category_id,
                models.HabitCategory.user_id == user_id,
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
    
    habit = models.Habit(
        user_id=user_id,
        habit_name=payload.name,
        category_id=category_id,
        emoji=payload.emoji,
        duration_minutes=payload.duration_minutes or 30,
        description=payload.description,
        is_active=payload.is_active if payload.is_active is not None else True,
        start_date=date.today(),
        best_streak=0,)
    
    db.add(habit)
    db.commit()
    db.refresh(habit)
    db.refresh(habit, attribute_names=["completions", "sessions", "category"])
    
    # Check achievements
    check_habit_achievements(db, user_id)
    
    return _build_habit_response(habit)


@router.get("/{habit_id}", response_model=schemas.HabitOut)
def get_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific habit"""
    user_id = _user_id(current_user)
    
    # Use joinedload to eagerly load category
    habit = (
        db.query(models.Habit)
        .options(
            joinedload(models.Habit.category),  
            joinedload(models.Habit.completions),  
            joinedload(models.Habit.sessions),
        )
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    return _build_habit_response(habit)


@router.put("/{habit_id}", response_model=schemas.HabitOut)
def update_habit(
    habit_id: int,
    payload: schemas.HabitUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a habit"""
    user_id = _user_id(current_user)
    
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    if payload.habit_name is not None:
        habit.habit_name = payload.habit_name
    if payload.category_id is not None:
        # Validate category exists AND belongs to user
        category = (
            db.query(models.HabitCategory)
            .filter(
                models.HabitCategory.category_id == payload.category_id,
                models.HabitCategory.user_id == user_id,
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found or does not belong to user")
        habit.category_id = payload.category_id
    if payload.emoji is not None:
        habit.emoji = payload.emoji
    if payload.duration_minutes is not None:
        habit.duration_minutes = payload.duration_minutes
    if payload.description is not None:
        habit.description = payload.description
    if payload.is_active is not None:
        habit.is_active = payload.is_active
    
    db.commit()
    db.refresh(habit, attribute_names=["completions", "sessions", "category"])
    
    return _build_habit_response(habit)



@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a habit"""
    user_id = _user_id(current_user)
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    db.delete(habit)
    db.commit()
    
    check_habit_achievements(db, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Habit Session Routes
@router.get("/{habit_id}/sessions", response_model=List[schemas.HabitSessionOut])
def get_habit_sessions(
    habit_id: int,
    date_filter: Optional[date] = Query(None, description="Filter by date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all sessions for a habit"""
    user_id = _user_id(current_user)
    
    # Verify habit exists
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    query = db.query(models.HabitSession).filter(
        models.HabitSession.habit_id == habit_id,
        models.HabitSession.user_id == user_id,
    )
    
    if date_filter:
        query = query.filter(models.HabitSession.session_date == date_filter)
    
    sessions = query.order_by(models.HabitSession.session_date.desc()).all()
    return sessions


@router.post("/{habit_id}/sessions", response_model=schemas.HabitSessionOut, status_code=status.HTTP_201_CREATED)
def create_habit_session(
    habit_id: int,
    payload: schemas.HabitSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new session for a habit"""
    user_id = _user_id(current_user)
    
    # Verify habit exists
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    session_date = payload.session_date or date.today()
    
    # Check if session exists for this date
    existing = (
        db.query(models.HabitSession)
        .filter(
            models.HabitSession.habit_id == habit_id,
            models.HabitSession.user_id == user_id,
            models.HabitSession.session_date == session_date,
        )
        .first()
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Session already exists for this date")
    
    session = models.HabitSession(
        habit_id=habit_id,
        user_id=user_id,
        session_date=session_date,
        planned_duration_seconds=payload.planned_duration_seconds,
        notes=payload.notes,
        status="todo",
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.put("/{habit_id}/sessions/{session_id}", response_model=schemas.HabitSessionOut)
def update_habit_session(
    habit_id: int,
    session_id: int,
    payload: schemas.HabitSessionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a habit session"""
    from datetime import datetime
    
    user_id = _user_id(current_user)
    
    session = (
        db.query(models.HabitSession)
        .filter(
            models.HabitSession.session_id == session_id,
            models.HabitSession.habit_id == habit_id,
            models.HabitSession.user_id == user_id,
        )
        .first()
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    old_status = session.status
    
    if payload.status is not None:
        session.status = payload.status
        
        # Set started_at when transitioning to in_progress
        if payload.status == "in_progress" and not session.started_at:
            session.started_at = datetime.utcnow()
            print(f"SET started_at: {session.started_at}")
        
        # Set completed_at when transitioning to done
        elif payload.status == "done" and not session.completed_at:
            session.completed_at = datetime.utcnow()
            print(f"SET completed_at: {session.completed_at}")
        
        # If pausing, keep started_at but don't set completed_at
        elif payload.status == "todo" and old_status == "in_progress":
            print(f"⏸PAUSED: keeping started_at={session.started_at}")
    
    # Update actual_duration_seconds (in seconds!)
    if payload.actual_duration_seconds is not None:
        session.actual_duration_seconds = payload.actual_duration_seconds
        print(f"Updated actual_duration_seconds: {payload.actual_duration_seconds}s")
    
    if payload.notes is not None:
        session.notes = payload.notes
    
    db.commit()
    db.refresh(session)
    
    print(f"Session updated: status={session.status}, actual_duration_seconds={session.actual_duration_seconds}s")
    
    # Check streak achievements if session is marked done
    if session.status == "done":
        check_streak_achievements(db, user_id)
    
    return session


@router.get("/{habit_id}/sessions", response_model=List[schemas.HabitSessionOut])
def get_habit_sessions(
    habit_id: int,
    date_filter: Optional[date] = Query(None, description="Filter by date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all sessions for a habit"""
    user_id = _user_id(current_user)
    
    # Verify habit exists
    habit = (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    )
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    query = db.query(models.HabitSession).filter(
        models.HabitSession.habit_id == habit_id,
        models.HabitSession.user_id == user_id,
    )
    
    if date_filter:
        query = query.filter(models.HabitSession.session_date == date_filter)
    
    sessions = query.order_by(models.HabitSession.session_date.desc()).all()
    return sessions


@router.delete("/{habit_id}/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_habit_session(
    habit_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a habit session"""
    user_id = _user_id(current_user)
    
    session = (
        db.query(models.HabitSession)
        .filter(
            models.HabitSession.session_id == session_id,
            models.HabitSession.habit_id == habit_id,
            models.HabitSession.user_id == user_id,
        )
        .first()
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Completion Routes
@router.post("/{habit_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
def mark_complete(
    habit_id: int,
    on: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Mark habit complete for a date (legacy endpoint)"""
    user_id = _user_id(current_user)
    
    if not (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    ):
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    # Log completion
    db_completion = models.HabitCompletion(
        habit_id=habit_id,
        user_id=user_id,
        completed_on=on,
    )
    db.add(db_completion)
    db.commit()
    
    check_streak_achievements(db, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{habit_id}/complete", status_code=status.HTTP_204_NO_CONTENT)
def unmark_complete(
    habit_id: int,
    on: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Unmark habit complete for a date (legacy endpoint)"""
    user_id = _user_id(current_user)
    
    if not (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id, models.Habit.user_id == user_id)
        .first()
    ):
        raise HTTPException(status_code=404, detail="Habit not found or not owned by user")
    
    from sqlalchemy import and_, delete
    
    stmt = delete(models.HabitCompletion).where(
        and_(
            models.HabitCompletion.habit_id == habit_id,
            models.HabitCompletion.user_id == user_id,
            models.HabitCompletion.completed_on == on,
        )
    )
    result = db.execute(stmt)
    db.commit()
    
    check_streak_achievements(db, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _build_habit_response(habit: models.Habit) -> dict:
    """Convert Habit ORM object to response dict"""
    # Build history from completions
    history = {
        str(completion.completed_on): True
        for completion in habit.completions
    }
    
    # Build sessions list
    sessions = [
        schemas.HabitSessionOut.from_orm(s)
        for s in habit.sessions
    ]
    
    # Build category data
    category_data = None
    if habit.category:
        category_data = {
            "category_id": habit.category.category_id,
            "user_id": habit.category.user_id,
            "category_name": habit.category.category_name,
            "color": habit.category.color,
            "created_at": habit.category.created_at,
        }
    elif habit.category_id:
        print(f"WARNING: Habit {habit.habit_id} has category_id={habit.category_id} but category is NULL")
    
    return {
        "habit_id": habit.habit_id,
        "user_id": habit.user_id,
        "habit_name": habit.habit_name,
        "category_id": habit.category_id,
        "category": category_data,
        "emoji": habit.emoji,
        "duration_minutes": habit.duration_minutes,
        "description": habit.description,
        "start_date": habit.start_date,
        "end_date": habit.end_date,
        "best_streak": habit.best_streak,
        "is_active": habit.is_active,
        "history": history,
        "sessions": sessions,
        "created_at": habit.created_at,
        "updated_at": habit.updated_at,
    }
