from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# User
class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    profile_picture: Optional[str] = None


class UserCreate(UserBase):
    password: str  # raw password when creating


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
    access_token: str
    token_type: str = "bearer"


# Habit
class HabitCreate(BaseModel):
    name: str
    category: str = "general"
    is_active: bool = True


class HabitOut(BaseModel):
    habit_id: int
    user_id: int
    habit_name: str
    category_id: str
    start_date: date
    end_date: Optional[date] = None
    best_streak: int
    is_active: bool
    history: Dict[str, bool] = Field(default_factory=dict)

    class Config:
        from_attributes = True


# Gratitude
class GratitudeEntryCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    category: Optional[str] = None


class GratitudeEntryOut(BaseModel):
    id: int = Field(validation_alias="gratitude_id")
    text: str = Field(validation_alias="body")
    category: Optional[str] = None
    date: str  # formatted as local date string
    image: Optional[str] = Field(None, validation_alias="image_url")  # NEW: Add image support

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
