from sqlalchemy import (
    Column, Integer, String, Date, Boolean, Text, ForeignKey,
    UniqueConstraint, DateTime
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email   = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False) 
    bio = Column(Text, nullable=True)
    name    = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

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


class Habit(Base):
    __tablename__ = "habits"

    habit_id    = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"),
                         nullable=False, index=True)
    habit_name  = Column(String, nullable=False)
    category_id = Column(String)
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date)
    best_streak = Column(Integer, default=0)
    is_active   = Column(Boolean, default=True)

    # Habit ↔ User
    owner = relationship(
        "User",
        back_populates="habits",
    )

    # Habit ↔ HabitCompletion
    completions = relationship(
        "HabitCompletion",
        back_populates="habit",
        cascade="all, delete-orphan",
    )


class HabitCompletion(Base):
    __tablename__ = "habit_completions"

    completion_id = Column(Integer, primary_key=True, index=True)
    habit_id      = Column(Integer, ForeignKey("habits.habit_id", ondelete="CASCADE"),
                           nullable=False, index=True)
    user_id       = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"),
                           nullable=False, index=True)
    completed_on  = Column(Date, nullable=False)
    note          = Column(Text)

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
        UniqueConstraint("habit_id", "user_id", "completed_on",
                         name="uq_completion_per_day"),
    )