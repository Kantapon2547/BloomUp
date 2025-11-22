from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Habit Category 
class HabitCategoryCreate(BaseModel):
    category_name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#ede9ff")


class HabitCategoryOut(BaseModel):
    category_id: int
    user_id: int
    category_name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class HabitCategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    color: Optional[str] = None


# Habit Session
class HabitSessionCreate(BaseModel):
    planned_duration_seconds: int = Field(ge=1)
    session_date: Optional[date] = None
    notes: Optional[str] = None


class HabitSessionUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(todo|in_progress|done)$")
    actual_duration_seconds: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class HabitSessionOut(BaseModel):
    session_id: int
    habit_id: int
    user_id: int
    status: str  # 'todo', 'in_progress', 'done'
    planned_duration_seconds: int
    actual_duration_seconds: int
    session_date: date
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Habit
class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    emoji: Optional[str] = Field(default="📚")
    duration_minutes: Optional[int] = Field(default=30, ge=1)
    description: Optional[str] = None
    is_active: Optional[bool] = True


class HabitUpdate(BaseModel):
    habit_name: Optional[str] = None
    category_id: Optional[int] = None
    emoji: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class HabitOut(BaseModel):
    habit_id: int
    user_id: int
    habit_name: str
    category_id: Optional[int] = None
    category: Optional[HabitCategoryOut] = None
    emoji: str
    duration_minutes: int
    start_date: date
    end_date: Optional[date] = None
    best_streak: int
    is_active: bool
    description: Optional[str] = None
    history: Dict[str, bool] = Field(default_factory=dict)
    sessions: List[HabitSessionOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Habit Batch Operations
class HabitBulkOut(BaseModel):
    """Lightweight habit with categories for list view"""
    habit_id: int
    user_id: int
    habit_name: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    color: Optional[str] = None
    emoji: str
    duration_minutes: int
    best_streak: int
    is_active: bool
    completed_today: bool = False
    week_completion: int = 0


# User
class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    profile_picture: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    user_id: int
    name: str
    email: str
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    token: str
    token_type: str = "bearer"


# Gratitude
class GratitudeEntryCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    category: Optional[str] = None


class GratitudeEntryOut(BaseModel):
    id: int = Field(validation_alias="gratitude_id")
    text: str = Field(validation_alias="body")
    category: Optional[str] = None
    date: str
    image: Optional[str] = Field(None, validation_alias="image_url")

    class Config:
        from_attributes = True
        populate_by_name = True


# Mood
class MoodLogCreate(BaseModel):
    mood_score: int = Field(ge=1, le=10, description="Mood score from 1-10")
    note: Optional[str] = Field(None, max_length=500)
    logged_on: Optional[date] = None


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


# Achievement
class AchievementRequirementOut(BaseModel):
    requirement_id: int
    achievement_id: int
    requirement_type: str
    target_value: Optional[int] = None
    unit: Optional[str] = None
    extra_meta: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class AchievementOut(BaseModel):
    achievement_id: int
    key_name: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    points: int = 0
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)
    requirements: List[AchievementRequirementOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserAchievementOut(BaseModel):
    user_achievement_id: int
    user_id: int
    achievement_id: int
    progress: int = 0
    progress_unit_value: int = 0
    is_earned: bool = False
    earned_date: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict)
    achievement: AchievementOut
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserAchievementSummary(BaseModel):
    """Simplified achievement summary for profile"""
    achievement_id: int
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    points: int
    is_earned: bool
    earned_date: Optional[datetime] = None
    progress: int
    progress_unit_value: int
    
    class Config:
        from_attributes = True