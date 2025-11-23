from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from sqlalchemy import func

from .db import Base


def get_utc_now():
    """Return current UTC time (databases store in UTC, Python converts to Bangkok)"""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    name = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now())

    # User ↔ Habit
    habits = relationship(
        "Habit",
        back_populates="owner",
        cascade="all, delete-orphan",
    )

    # User ↔ HabitCompletion
    habit_completions = relationship(
        "HabitCompletion",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # User ↔ GratitudeEntry
    gratitude_entries = relationship(
        "GratitudeEntry",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # User ↔ MoodLog
    mood_logs = relationship(
        "MoodLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # User ↔ UserAchievement
    user_achievements = relationship(
        "UserAchievement",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class HabitCategory(Base):
    """Categories for habits with custom colors"""
    __tablename__ = "habit_categories"

    category_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_name = Column(String(100), nullable=False)
    color = Column(String(7), default="#ede9ff")
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    habits = relationship(
        "Habit",
        back_populates="category",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "category_name", name="uq_user_category_name"),
    )


class Habit(Base):
    __tablename__ = "habits"

    habit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id = Column(
        Integer,
        ForeignKey("habit_categories.category_id", ondelete="SET NULL"),
        nullable=True,
    )
    habit_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    emoji = Column(String(32), default="📚")
    duration_minutes = Column(Integer, default=30)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    best_streak = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Habit ↔ User
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship(
        "User",
        back_populates="habits",
    )

    # Habit ↔ HabitCompletion
    category = relationship(
        "HabitCategory",
        back_populates="habits",
    )

    completions = relationship(
        "HabitCompletion",
        back_populates="habit",
        cascade="all, delete-orphan",
    )

    sessions = relationship(
        "HabitSession",
        back_populates="habit",
        cascade="all, delete-orphan",
    )


class HabitCompletion(Base):
    __tablename__ = "habit_completions"

    completion_id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(
        Integer,
        ForeignKey("habits.habit_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    completed_on = Column(Date, nullable=False)
    note = Column(Text)

    # HabitCompletion ↔ Habit
    habit = relationship(
        "Habit",
        back_populates="completions",
    )

    # HabitCompletion ↔ User
    user = relationship(
        "User",
        back_populates="habit_completions",
    )

    __table_args__ = (
        UniqueConstraint(
            "habit_id", "user_id", "completed_on", name="uq_completion_per_day"
        ),
    )


class HabitSession(Base):
    """Timer sessions for habits with status tracking"""
    __tablename__ = "habit_sessions"

    session_id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(
        Integer,
        ForeignKey("habits.habit_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Status: 'todo', 'in_progress', 'done'
    status = Column(String(20), default="todo", nullable=False)
    
    # Timer/Duration tracking
    planned_duration_seconds = Column(Integer, nullable=False)  
    actual_duration_seconds = Column(Integer, default=0)
    
    # Timestamps
    session_date = Column(Date, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Metadata
    notes = Column(Text, nullable=True)
    meta = Column(JSONB, default={})

    habit = relationship(
        "Habit",
        back_populates="sessions",
    )

    __table_args__ = (
        UniqueConstraint(
            "habit_id", "user_id", "session_date", name="uq_session_per_day"
        ),
    )


class GratitudeEntry(Base):
    __tablename__ = "gratitude_entries"

    gratitude_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # GratitudeEntry ↔ User
    user = relationship(
        "User",
        back_populates="gratitude_entries",
    )


class MoodLog(Base):
    __tablename__ = "mood_logs"

    mood_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mood_score = Column(Integer, nullable=False)
    logged_on = Column(Date, nullable=False, index=True)
    note = Column(Text, nullable=True)

    # MoodLog ↔ User
    user = relationship(
        "User",
        back_populates="mood_logs",
    )

    __table_args__ = (UniqueConstraint("user_id", "logged_on", name="uq_mood_per_day"),)


class Achievement(Base):
    __tablename__ = "achievements"

    achievement_id = Column(Integer, primary_key=True, index=True)
    key_name = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text)
    icon = Column(String(32))
    points = Column(Integer, default=0)
    meta = Column(JSONB, default={})

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    requirements = relationship(
        "AchievementRequirement",
        back_populates="achievement",
        cascade="all, delete-orphan",
    )
    user_achievements = relationship(
        "UserAchievement", back_populates="achievement", cascade="all, delete-orphan"
    )


class AchievementRequirement(Base):
    __tablename__ = "achievement_requirements"

    requirement_id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(
        Integer,
        ForeignKey("achievements.achievement_id", ondelete="CASCADE"),
        nullable=False,
    )
    requirement_type = Column(String(50), nullable=False)
    target_value = Column(Integer)
    unit = Column(String(30))
    extra_meta = Column(JSONB, default={})

    achievement = relationship("Achievement", back_populates="requirements")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_achievement_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    achievement_id = Column(
        Integer,
        ForeignKey("achievements.achievement_id", ondelete="CASCADE"),
        nullable=False,
    )
    progress = Column(Integer, default=0)
    progress_unit_value = Column(Integer, default=0)
    is_earned = Column(Boolean, default=False)
    earned_date = Column(DateTime, nullable=True)
    meta = Column(JSONB, default={})

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    user = relationship("User", back_populates="user_achievements")
    achievement = relationship("Achievement", back_populates="user_achievements")

    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )
