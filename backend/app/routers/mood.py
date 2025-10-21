from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import logging

from .. import schemas, crud, models
from ..db import get_db
from ..security import get_current_user
from ..services.achievement_checker import check_mood_achievements

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mood", tags=["Mood"])


def _user_id(u: models.User) -> int:
    """Extract the integer user_id from the authenticated User object."""
    user_id = getattr(u, "user_id", None)
    if user_id is None:
        raise HTTPException(
            status_code=500, 
            detail="Authenticated user lacks user_id"
        )
    return user_id


# Request/Response models
class MoodLogCreate(BaseModel):
    mood_score: int = Field(ge=1, le=10, description="Mood score from 1-10")
    note: Optional[str] = Field(None, max_length=500)
    logged_on: Optional[date] = None

    class Config:
        json_schema_extra = {
            "example": {
                "mood_score": 8,
                "note": "Had a great day!",
                "logged_on": "2025-10-15"
            }
        }


class MoodLogUpdate(BaseModel):
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    note: Optional[str] = Field(None, max_length=500)


class MoodLogOut(BaseModel):
    mood_id: int
    user_id: int
    mood_score: int
    logged_on: date
    note: Optional[str] = None
    
    class Config:
        from_attributes = True


class MoodStatsOut(BaseModel):
    average_mood: float
    total_logs: int
    highest_mood: int
    lowest_mood: int
    current_streak: int
    best_streak: int
    logs_this_week: int
    logs_this_month: int


class MoodTrendOut(BaseModel):
    date: date
    mood_score: int
    note: Optional[str] = None


# Routes
@router.get("/", response_model=List[MoodLogOut])
def list_mood_logs(
    limit: int = Query(30, ge=1, le=365, description="Number of logs to return"),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = Query(None, description="Filter from this date"),
    end_date: Optional[date] = Query(None, description="Filter until this date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all mood logs for the authenticated user with optional filters."""
    try:
        user_id = _user_id(current_user)
        logger.info(f"Fetching moods for user {user_id}")
        
        logs = crud.get_user_mood_logs(
            db, 
            user_id=user_id,
            limit=limit,
            offset=offset,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"Found {len(logs)} mood logs for user {user_id}")
        return logs
    except Exception as e:
        logger.error(f"Error in list_mood_logs: {e}", exc_info=True)
        raise


@router.post("/", response_model=MoodLogOut, status_code=status.HTTP_201_CREATED)
def create_mood_log(
    payload: MoodLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Log a new mood entry."""
    try:
        user_id = _user_id(current_user)
        log_date = payload.logged_on or date.today()
        
        logger.info(f"Creating mood for user {user_id} on {log_date}: score={payload.mood_score}")
        
        # Check if already exists
        existing = crud.get_mood_log_by_date(db, user_id, log_date)
        if existing:
            logger.warning(f"Mood already exists for {log_date}")
            raise HTTPException(
                status_code=400,
                detail=f"Mood log already exists for {log_date}. Use PUT to update it."
            )
        
        result = crud.create_mood_log(
            db,
            user_id=user_id,
            mood_score=payload.mood_score,
            note=payload.note,
            logged_on=log_date
        )
        
        # Check achievements after creating mood log
        check_mood_achievements(db, user_id)
        
        logger.info(f"Mood created successfully: {result.mood_id}")
        return result
    except Exception as e:
        logger.error(f"Error in create_mood_log: {e}", exc_info=True)
        raise


@router.get("/stats", response_model=MoodStatsOut)
def get_mood_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get mood statistics for the authenticated user."""
    user_id = _user_id(current_user)
    return crud.get_mood_statistics(db, user_id, days=days)


@router.get("/trend", response_model=List[MoodTrendOut])
def get_mood_trend(
    days: int = Query(7, ge=1, le=90, description="Number of days for trend"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get mood trend data for visualization."""
    user_id = _user_id(current_user)
    start_date = date.today() - timedelta(days=days)
    
    logs = crud.get_user_mood_logs(
        db,
        user_id=user_id,
        start_date=start_date,
        limit=days
    )
    
    return [
        MoodTrendOut(
            date=log.logged_on,
            mood_score=log.mood_score,
            note=log.note
        )
        for log in logs
    ]


@router.get("/today", response_model=Optional[MoodLogOut])
def get_today_mood(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get today's mood log if it exists."""
    user_id = _user_id(current_user)
    log = crud.get_mood_log_by_date(db, user_id, date.today())
    return log


@router.get("/{mood_id}", response_model=MoodLogOut)
def get_mood_log(
    mood_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a specific mood log by ID."""
    user_id = _user_id(current_user)
    log = crud.get_mood_log(db, mood_id, user_id)
    
    if not log:
        raise HTTPException(
            status_code=404,
            detail="Mood log not found or not owned by user"
        )
    
    return log


@router.put("/{mood_id}", response_model=MoodLogOut)
def update_mood_log(
    mood_id: int,
    payload: MoodLogUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update an existing mood log."""
    user_id = _user_id(current_user)
    
    existing = crud.get_mood_log(db, mood_id, user_id)
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Mood log not found or not owned by user"
        )
    
    updated = crud.update_mood_log(
        db,
        mood_id=mood_id,
        user_id=user_id,
        mood_score=payload.mood_score,
        note=payload.note
    )
    
    # Check achievements after updating mood log
    check_mood_achievements(db, user_id)
    
    return updated


@router.delete("/{mood_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood_log(
    mood_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a mood log."""
    user_id = _user_id(current_user)
    
    success = crud.delete_mood_log(db, mood_id, user_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Mood log not found or not owned by user"
        )
    
    # Check achievements after deleting mood log
    check_mood_achievements(db, user_id)
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/week/summary")
def get_week_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get a summary of this week's mood logs."""
    user_id = _user_id(current_user)
    
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday() + 1)
    if today.weekday() == 6:
        start_of_week = today
    
    logs = crud.get_user_mood_logs(
        db,
        user_id=user_id,
        start_date=start_of_week,
        limit=7
    )
    
    if not logs:
        return {
            "week_start": start_of_week,
            "logs_count": 0,
            "average_mood": 0,
            "logs": []
        }
    
    avg_mood = sum(log.mood_score for log in logs) / len(logs)
    
    return {
        "week_start": start_of_week,
        "logs_count": len(logs),
        "average_mood": round(avg_mood, 1),
        "logs": [
            {
                "date": log.logged_on,
                "mood_score": log.mood_score,
                "note": log.note
            }
            for log in logs
        ]
    }