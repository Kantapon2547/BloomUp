import pytest
from datetime import date
from app.crud import (
    get_habit,
    get_habits_for_user,
    log_habit_completion,
    remove_habit_completion,
)


class TestGetHabit:
    """Tests for get_habit function"""
    
    def test_get_habit_exists(self, db, test_user, test_habit):
        """Retrieve existing habit"""
        habit = get_habit(db, test_habit.habit_id, test_user.user_id)
        assert habit is not None
        assert habit.habit_name == "Morning Exercise"
        assert habit.habit_id == test_habit.habit_id
    
    def test_get_habit_not_exists(self, db, test_user):
        """Return None for non-existent habit"""
        habit = get_habit(db, 999, test_user.user_id)
        assert habit is None
    
    def test_get_habit_wrong_user(self, db, test_user, test_user2, test_habit):
        """User cannot access another user's habit"""
        habit = get_habit(db, test_habit.habit_id, test_user2.user_id)
        assert habit is None
    
    def test_get_habit_returns_all_fields(self, db, test_user, test_habit):
        """Returned habit has all expected fields"""
        habit = get_habit(db, test_habit.habit_id, test_user.user_id)
        assert habit.habit_id
        assert habit.user_id == test_user.user_id
        assert habit.habit_name
        assert habit.emoji
        assert habit.duration_minutes


class TestGetHabitsForUser:
    """Tests for get_habits_for_user function"""
    
    def test_get_habits_for_user_empty(self, db, test_user):
        """Return empty list when user has no habits"""
        habits = get_habits_for_user(db, test_user.user_id)
        assert habits == []
    
    def test_get_habits_for_user_single(self, db, test_user, test_habit):
        """Return list with single habit"""
        habits = get_habits_for_user(db, test_user.user_id)
        assert len(habits) == 1
        assert habits[0]["habit_name"] == "Morning Exercise"
    
    def test_get_habits_for_user_multiple(self, db, test_user):
        """Return list with multiple habits"""
        from app import models
        
        habit1 = models.Habit(
            user_id=test_user.user_id,
            habit_name="Exercise",
            emoji="🏃",
            duration_minutes=30,
            start_date=date.today(),
        )
        habit2 = models.Habit(
            user_id=test_user.user_id,
            habit_name="Reading",
            emoji="📚",
            duration_minutes=45,
            start_date=date.today(),
        )
        db.add_all([habit1, habit2])
        db.commit()
        
        habits = get_habits_for_user(db, test_user.user_id)
        assert len(habits) == 2
    
    def test_get_habits_for_user_includes_history(self, db, test_user, test_habit):
        """Returned habits include completion history"""
        log_habit_completion(db, test_habit.habit_id, test_user.user_id, date.today())
        
        habits = get_habits_for_user(db, test_user.user_id)
        assert len(habits) == 1
        assert "history" in habits[0]
        assert str(date.today()) in habits[0]["history"]
    
    def test_get_habits_for_user_isolated_by_user(self, db, test_user, test_user2):
        """Each user only sees their own habits"""
        from app import models
        
        habit1 = models.Habit(
            user_id=test_user.user_id,
            habit_name="User1 Habit",
            emoji="🏃",
            duration_minutes=30,
            start_date=date.today(),
        )
        habit2 = models.Habit(
            user_id=test_user2.user_id,
            habit_name="User2 Habit",
            emoji="📚",
            duration_minutes=45,
            start_date=date.today(),
        )
        db.add_all([habit1, habit2])
        db.commit()
        
        habits1 = get_habits_for_user(db, test_user.user_id)
        habits2 = get_habits_for_user(db, test_user2.user_id)
        
        assert len(habits1) == 1
        assert len(habits2) == 1
        assert habits1[0]["habit_name"] == "User1 Habit"
        assert habits2[0]["habit_name"] == "User2 Habit"


class TestLogHabitCompletion:
    """Tests for log_habit_completion function"""
    
    def test_log_habit_completion_success(self, db, test_user, test_habit):
        """Log habit completion successfully"""
        completion_date = date.today()
        completion = log_habit_completion(
            db, test_habit.habit_id, test_user.user_id, completion_date
        )
        
        assert completion is not None
        assert completion.habit_id == test_habit.habit_id
        assert completion.user_id == test_user.user_id
        assert completion.completed_on == completion_date
    
    def test_log_habit_completion_different_dates(self, db, test_user, test_habit):
        """Log completions on multiple dates"""
        from datetime import timedelta
        
        date1 = date.today()
        date2 = date.today() - timedelta(days=1)
        
        c1 = log_habit_completion(db, test_habit.habit_id, test_user.user_id, date1)
        c2 = log_habit_completion(db, test_habit.habit_id, test_user.user_id, date2)
        
        assert c1.completed_on == date1
        assert c2.completed_on == date2
    
    def test_log_habit_completion_returns_object(self, db, test_user, test_habit):
        """Returned object has all expected fields"""
        completion = log_habit_completion(
            db, test_habit.habit_id, test_user.user_id, date.today()
        )
        
        assert hasattr(completion, "completion_id")
        assert hasattr(completion, "habit_id")
        assert hasattr(completion, "user_id")
        assert hasattr(completion, "completed_on")


class TestRemoveHabitCompletion:
    """Tests for remove_habit_completion function"""
    
    def test_remove_habit_completion_success(self, db, test_user, test_habit):
        """Remove logged completion successfully"""
        completion_date = date.today()
        log_habit_completion(db, test_habit.habit_id, test_user.user_id, completion_date)
        
        result = remove_habit_completion(
            db, test_habit.habit_id, test_user.user_id, completion_date
        )
        assert result is True
    
    def test_remove_habit_completion_not_exists(self, db, test_user, test_habit):
        """Return False when completion doesn't exist"""
        result = remove_habit_completion(
            db, test_habit.habit_id, test_user.user_id, date.today()
        )
        assert result is False
    
    def test_remove_habit_completion_different_user(self, db, test_user, test_user2, test_habit):
        """Cannot remove another user's completion"""
        completion_date = date.today()
        log_habit_completion(db, test_habit.habit_id, test_user.user_id, completion_date)
        
        result = remove_habit_completion(
            db, test_habit.habit_id, test_user2.user_id, completion_date
        )
        assert result is False
    
    def test_remove_habit_completion_only_removes_specific_date(self, db, test_user, test_habit):
        """Removing one date doesn't remove others"""
        from datetime import timedelta
        
        date1 = date.today()
        date2 = date.today() - timedelta(days=1)
        
        log_habit_completion(db, test_habit.habit_id, test_user.user_id, date1)
        log_habit_completion(db, test_habit.habit_id, test_user.user_id, date2)
        
        remove_habit_completion(db, test_habit.habit_id, test_user.user_id, date1)
        
        habits = get_habits_for_user(db, test_user.user_id)
        assert str(date2) in habits[0]["history"]
        assert str(date1) not in habits[0]["history"]
