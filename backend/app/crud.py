from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, delete
from datetime import date
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
    # completion
    db_completion = models.HabitCompletion(
        habitid=habit_id,
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
