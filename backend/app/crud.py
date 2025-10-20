from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, delete
from datetime import date, timedelta
from typing import List, Optional

from . import models, schemas

# User (for security)
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

# Habit 
def get_habit(db: Session, habit_id: int, user_id: int):
    return (
        db.query(models.Habit)
        .filter(models.Habit.habit_id == habit_id,
                models.Habit.user_id == user_id)
        .first()
    )

def _build_habit_with_history(habit: models.Habit) -> dict:
    """Convert a Habit ORM object to dict with history field for frontend."""
    # Build history dict from completions
    history = {
        # {"2025-10-08": True, ...}
        str(completion.completed_on): True 
        for completion in habit.completions
    } 
    
    return {
        "habit_id": habit.habit_id,
        "user_id": habit.user_id,
        "habit_name": habit.habit_name,
        "category_id": habit.category_id,
        "start_date": habit.start_date,
        "end_date": habit.end_date,
        "best_streak": habit.best_streak,
        "is_active": habit.is_active,
        "history": history,
    }

def get_habits_for_user(db: Session, user_id: int) -> List[dict]:
    habits = (
        db.query(models.Habit)
        .options(joinedload(models.Habit.completions))
        .filter(models.Habit.user_id == user_id)
        .order_by(models.Habit.habit_id.asc())
        .all()
    )
    return [_build_habit_with_history(h) for h in habits]

def get_user_habits(db: Session, user_id: int) -> List[dict]:
    """Convenience alias for get_habits_for_user."""
    return get_habits_for_user(db, user_id)

def create_user_habit(db: Session, habit: schemas.HabitCreate, user_id: int):
    obj = models.Habit(
        user_id=user_id,
        habit_name=habit.name,
        category_id=habit.category,
        is_active=True if habit.is_active is None else habit.is_active,
        start_date=date.today(),
        best_streak=0,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    
    # Load completions relationship for building history
    db.refresh(obj, attribute_names=["completions"])
    return _build_habit_with_history(obj)

def delete_user_habit(db: Session, habit_id: int, user_id: int) -> bool:
    obj = get_habit(db, habit_id, user_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True

def log_habit_completion(db: Session, habit_id: int, user_id: int, completed_on: date):
    """Create a habit completion record."""
    db_completion = models.HabitCompletion(
        habit_id=habit_id,  # FIXED: was habitid
        user_id=user_id,
        completed_on=completed_on,
    )
    db.add(db_completion)
    db.commit()
    db.refresh(db_completion)
    return db_completion

def remove_habit_completion(db: Session, habit_id: int, user_id: int, completed_on: date) -> bool:
    stmt = delete(models.HabitCompletion).where(
        and_(
            models.HabitCompletion.habit_id == habit_id,
            models.HabitCompletion.user_id == user_id,
            models.HabitCompletion.completed_on == completed_on,
        )
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount > 0


# Gratitude
def get_user_gratitude_entries(db: Session, user_id: int) -> List[dict]:
    """Get all gratitude entries for a user, formatted for frontend."""
    entries = (
        db.query(models.GratitudeEntry)
        .filter(models.GratitudeEntry.user_id == user_id)
        .order_by(models.GratitudeEntry.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": entry.gratitude_id,
            "text": entry.body,
            "category": entry.category or "",
            "date": entry.created_at.strftime("%d/%m/%Y"),  # DD/MM/YYYY
        }
        for entry in entries
    ]

def create_gratitude_entry(
    db: Session, 
    user_id: int, 
    text: str, 
    category: Optional[str] = None
) -> dict:
    """Create a new gratitude entry."""
    entry = models.GratitudeEntry(
        user_id=user_id,
        body=text,
        category=category,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return {
        "id": entry.gratitude_id,
        "text": entry.body,
        "category": entry.category or "",
        "date": entry.created_at.strftime("%m/%d/%Y"),
    }


def delete_gratitude_entry(db: Session, entry_id: int, user_id: int) -> bool:
    """Delete a gratitude entry (only if owned by user)."""
    entry = (
        db.query(models.GratitudeEntry)
        .filter(
            models.GratitudeEntry.gratitude_id == entry_id,
            models.GratitudeEntry.user_id == user_id,
        )
        .first()
    )
    
    if not entry:
        return False
    
    db.delete(entry)
    db.commit()
    return True


# Mood 
def get_mood_log(db: Session, mood_id: int, user_id: int) -> Optional[models.MoodLog]:
    """Get a specific mood log by ID for a user."""
    return (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.mood_id == mood_id,
            models.MoodLog.user_id == user_id
        )
        .first()
    )


def get_mood_log_by_date(
    db: Session, 
    user_id: int, 
    logged_on: date
) -> Optional[models.MoodLog]:
    """Get a mood log for a specific date."""
    return (
        db.query(models.MoodLog)
        .filter(
            models.MoodLog.user_id == user_id,
            models.MoodLog.logged_on == logged_on
        )
        .first()
    )


def get_user_mood_logs(
    db: Session,
    user_id: int,
    limit: int = 30,
    offset: int = 0,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[models.MoodLog]:
    """Get mood logs for a user with optional date filters."""
    query = (
        db.query(models.MoodLog)
        .filter(models.MoodLog.user_id == user_id)
    )
    
    if start_date:
        query = query.filter(models.MoodLog.logged_on >= start_date)
    
    if end_date:
        query = query.filter(models.MoodLog.logged_on <= end_date)
    
    return (
        query
        .order_by(models.MoodLog.logged_on.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def create_mood_log(
    db: Session,
    user_id: int,
    mood_score: int,
    note: Optional[str] = None,
    logged_on: date = None,
) -> models.MoodLog:
    """Create a new mood log entry."""
    if logged_on is None:
        logged_on = date.today()
    
    mood_log = models.MoodLog(
        user_id=user_id,
        mood_score=mood_score,
        note=note,
        logged_on=logged_on,
    )
    
    db.add(mood_log)
    db.commit()
    db.refresh(mood_log)
    return mood_log


def update_mood_log(
    db: Session,
    mood_id: int,
    user_id: int,
    mood_score: Optional[int] = None,
    note: Optional[str] = None,
) -> Optional[models.MoodLog]:
    """Update an existing mood log."""
    mood_log = get_mood_log(db, mood_id, user_id)
    
    if not mood_log:
        return None
    
    if mood_score is not None:
        mood_log.mood_score = mood_score
    
    if note is not None:
        mood_log.note = note
    
    db.commit()
    db.refresh(mood_log)
    return mood_log


def delete_mood_log(db: Session, mood_id: int, user_id: int) -> bool:
    """Delete a mood log."""
    mood_log = get_mood_log(db, mood_id, user_id)
    
    if not mood_log:
        return False
    
    db.delete(mood_log)
    db.commit()
    return True


def get_mood_statistics(db: Session, user_id: int, days: int = 30) -> dict:
    """Calculate mood statistics for a user over a period."""
    start_date = date.today() - timedelta(days=days)
    
    logs = get_user_mood_logs(
        db,
        user_id=user_id,
        start_date=start_date,
        limit=days
    )
    
    if not logs:
        return {
            "average_mood": 0,
            "total_logs": 0,
            "highest_mood": 0,
            "lowest_mood": 0,
            "current_streak": 0,
            "best_streak": 0,
            "logs_this_week": 0,
            "logs_this_month": 0,
        }
    
    # Basic stats
    mood_scores = [log.mood_score for log in logs]
    average_mood = sum(mood_scores) / len(mood_scores)
    
    # Week and month counts
    week_ago = date.today() - timedelta(days=7)
    month_ago = date.today() - timedelta(days=30)
    
    logs_this_week = sum(1 for log in logs if log.logged_on >= week_ago)
    logs_this_month = sum(1 for log in logs if log.logged_on >= month_ago)
    
    # Calculate streaks
    all_logs = get_user_mood_logs(
        db,
        user_id=user_id,
        limit=365  # Check up to a year for streaks
    )
    
    current_streak = 0
    best_streak = 0
    temp_streak = 0
    
    if all_logs:
        # Sort by date descending
        sorted_logs = sorted(all_logs, key=lambda x: x.logged_on, reverse=True)
        
        # Calculate current streak
        check_date = date.today()
        for log in sorted_logs:
            if log.logged_on == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
            elif log.logged_on < check_date:
                break
        
        # Calculate best streak
        prev_date = None
        for log in sorted(all_logs, key=lambda x: x.logged_on):
            if prev_date is None:
                temp_streak = 1
            elif (log.logged_on - prev_date).days == 1:
                temp_streak += 1
            else:
                best_streak = max(best_streak, temp_streak)
                temp_streak = 1
            
            prev_date = log.logged_on
        
        best_streak = max(best_streak, temp_streak)
    
    return {
        "average_mood": round(average_mood, 1),
        "total_logs": len(logs),
        "highest_mood": max(mood_scores),
        "lowest_mood": min(mood_scores),
        "current_streak": current_streak,
        "best_streak": best_streak,
        "logs_this_week": logs_this_week,
        "logs_this_month": logs_this_month,
    }