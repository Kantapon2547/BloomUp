import pytest
from datetime import date, timedelta
from app.crud import (
    create_mood_log,
    get_mood_log,
    get_mood_log_by_date,
    get_user_mood_logs,
    update_mood_log,
    delete_mood_log,
    get_mood_statistics,
)


class TestCreateMoodLog:
    """Tests for create_mood_log function"""
    
    def test_create_mood_log_success(self, db, test_user):
        """Create mood log successfully"""
        mood = create_mood_log(db, test_user.user_id, mood_score=5, note="Great!")
        
        assert mood.mood_id > 0
        assert mood.mood_score == 5
        assert mood.note == "Great!"
        assert mood.user_id == test_user.user_id
    
    def test_create_mood_log_specific_date(self, db, test_user):
        """Create mood log for specific date"""
        log_date = date.today() - timedelta(days=5)
        mood = create_mood_log(
            db, test_user.user_id, mood_score=6, logged_on=log_date
        )
        
        assert mood.logged_on == log_date
    
    def test_create_mood_log_defaults_to_today(self, db, test_user):
        """Create mood log defaults to today's date"""
        mood = create_mood_log(db, test_user.user_id, mood_score=7)
        
        assert mood.logged_on == date.today()
    
    def test_create_mood_log_different_scores(self, db, test_user):
        """Create mood logs with different scores on different dates"""
        for i, score in enumerate([1, 2, 3, 4, 5], start=0):
            log_date = date.today() - timedelta(days=i)
            mood = create_mood_log(db, test_user.user_id, mood_score=score, logged_on=log_date)
            assert mood.mood_score == score


class TestGetMoodLog:
    """Tests for get_mood_log function"""
    
    def test_get_mood_log_exists(self, db, test_user):
        """Retrieve existing mood log"""
        created = create_mood_log(db, test_user.user_id, mood_score=8)
        
        mood = get_mood_log(db, created.mood_id, test_user.user_id)
        assert mood is not None
        assert mood.mood_score == 8
    
    def test_get_mood_log_not_exists(self, db, test_user):
        """Return None for non-existent mood"""
        mood = get_mood_log(db, 999, test_user.user_id)
        assert mood is None
    
    def test_get_mood_log_wrong_user(self, db, test_user, test_user2):
        """User cannot access another user's mood"""
        created = create_mood_log(db, test_user.user_id, mood_score=8)
        
        mood = get_mood_log(db, created.mood_id, test_user2.user_id)
        assert mood is None


class TestGetMoodLogByDate:
    """Tests for get_mood_log_by_date function"""
    
    def test_get_mood_log_by_date_exists(self, db, test_user):
        """Retrieve mood by date"""
        log_date = date.today()
        create_mood_log(db, test_user.user_id, mood_score=8, logged_on=log_date)
        
        mood = get_mood_log_by_date(db, test_user.user_id, log_date)
        assert mood is not None
        assert mood.mood_score == 8
    
    def test_get_mood_log_by_date_not_exists(self, db, test_user):
        """Return None when no mood logged for date"""
        mood = get_mood_log_by_date(db, test_user.user_id, date.today())
        assert mood is None
    
    def test_get_mood_log_by_date_different_dates(self, db, test_user):
        """Different dates return different moods"""
        date1 = date.today()
        date2 = date.today() - timedelta(days=1)
        
        create_mood_log(db, test_user.user_id, mood_score=8, logged_on=date1)
        create_mood_log(db, test_user.user_id, mood_score=5, logged_on=date2)
        
        mood1 = get_mood_log_by_date(db, test_user.user_id, date1)
        mood2 = get_mood_log_by_date(db, test_user.user_id, date2)
        
        assert mood1.mood_score == 8
        assert mood2.mood_score == 5


class TestGetUserMoodLogs:
    """Tests for get_user_mood_logs function"""
    
    def test_get_user_mood_logs_empty(self, db, test_user):
        """Return empty list when no logs exist"""
        logs = get_user_mood_logs(db, test_user.user_id)
        assert logs == []
    
    def test_get_user_mood_logs_single(self, db, test_user):
        """Return single log"""
        create_mood_log(db, test_user.user_id, mood_score=8)
        
        logs = get_user_mood_logs(db, test_user.user_id)
        assert len(logs) == 1
    
    def test_get_user_mood_logs_multiple(self, db, test_user):
        """Return multiple logs ordered by date desc"""
        # Create logs on different dates to avoid unique constraint
        for i in range(5):
            create_mood_log(
                db, test_user.user_id, mood_score=i+1,
                logged_on=date.today() - timedelta(days=i)
            )
        
        logs = get_user_mood_logs(db, test_user.user_id, limit=100)
        assert len(logs) == 5
        # Verify ordered by date descending (most recent first)
        assert logs[0].logged_on >= logs[-1].logged_on
    
    def test_get_user_mood_logs_with_limit(self, db, test_user):
        """Limit results"""
        for i in range(10):
            create_mood_log(
                db, test_user.user_id, mood_score=5,
                logged_on=date.today() - timedelta(days=i)
            )
        
        logs = get_user_mood_logs(db, test_user.user_id, limit=5)
        assert len(logs) == 5
    
    def test_get_user_mood_logs_with_offset(self, db, test_user):
        """Offset results"""
        for i in range(5):
            create_mood_log(
                db, test_user.user_id, mood_score=i+1,
                logged_on=date.today() - timedelta(days=i)
            )
        
        logs = get_user_mood_logs(db, test_user.user_id, offset=2, limit=2)
        assert len(logs) == 2
    
    def test_get_user_mood_logs_with_date_filters(self, db, test_user):
        """Filter by date range"""
        for i in range(10):
            create_mood_log(
                db, test_user.user_id, mood_score=5,
                logged_on=date.today() - timedelta(days=i)
            )
        
        start = date.today() - timedelta(days=5)
        end = date.today() - timedelta(days=2)
        logs = get_user_mood_logs(db, test_user.user_id, start_date=start, end_date=end, limit=100)
        
        for log in logs:
            assert start <= log.logged_on <= end


class TestUpdateMoodLog:
    """Tests for update_mood_log function"""
    
    def test_update_mood_log_score(self, db, test_user):
        """Update mood score"""
        mood = create_mood_log(db, test_user.user_id, mood_score=5)
        
        updated = update_mood_log(db, mood.mood_id, test_user.user_id, mood_score=2)
        assert updated.mood_score == 2
    
    def test_update_mood_log_note(self, db, test_user):
        """Update mood note"""
        mood = create_mood_log(db, test_user.user_id, mood_score=1, note="Old note")
        
        updated = update_mood_log(db, mood.mood_id, test_user.user_id, note="New note")
        assert updated.note == "New note"
    
    def test_update_mood_log_both_fields(self, db, test_user):
        """Update both score and note"""
        mood = create_mood_log(db, test_user.user_id, mood_score=5, note="Old")
        
        updated = update_mood_log(
            db, mood.mood_id, test_user.user_id, mood_score=2, note="New"
        )
        assert updated.mood_score == 2
        assert updated.note == "New"
    
    def test_update_mood_log_not_exists(self, db, test_user):
        """Return None for non-existent mood"""
        updated = update_mood_log(db, 999, test_user.user_id, mood_score=4)
        assert updated is None


class TestDeleteMoodLog:
    """Tests for delete_mood_log function"""
    
    def test_delete_mood_log_success(self, db, test_user):
        """Delete mood log successfully"""
        mood = create_mood_log(db, test_user.user_id, mood_score=3)
        
        deleted = delete_mood_log(db, mood.mood_id, test_user.user_id)
        assert deleted is True
    
    def test_delete_mood_log_not_exists(self, db, test_user):
        """Return False for non-existent mood"""
        deleted = delete_mood_log(db, 999, test_user.user_id)
        assert deleted is False
    
    def test_delete_mood_log_wrong_user(self, db, test_user, test_user2):
        """User cannot delete another user's mood"""
        mood = create_mood_log(db, test_user.user_id, mood_score=1)
        
        deleted = delete_mood_log(db, mood.mood_id, test_user2.user_id)
        assert deleted is False


class TestGetMoodStatistics:
    """Tests for get_mood_statistics function"""
    
    def test_get_mood_statistics_empty(self, db, test_user):
        """Return default stats when no logs"""
        stats = get_mood_statistics(db, test_user.user_id)
        
        assert stats["average_mood"] == 0
        assert stats["total_logs"] == 0
        assert stats["highest_mood"] == 0
        assert stats["lowest_mood"] == 0
    
    def test_get_mood_statistics_single_log(self, db, test_user):
        """Calculate stats with single log"""
        create_mood_log(db, test_user.user_id, mood_score=5)
        
        stats = get_mood_statistics(db, test_user.user_id)
        assert stats["total_logs"] == 1
        assert stats["average_mood"] == 5.0
        assert stats["highest_mood"] == 5
        assert stats["lowest_mood"] == 5
    
    def test_get_mood_statistics_multiple_logs(self, db, test_user):
        """Calculate stats with multiple logs on different dates"""
        scores = [1, 2, 3, 4, 5]
        for i, score in enumerate(scores):
            create_mood_log(
                db, test_user.user_id, mood_score=score,
                logged_on=date.today() - timedelta(days=i)
            )
        
        stats = get_mood_statistics(db, test_user.user_id, days=30)
        assert stats["total_logs"] == 5
        assert stats["average_mood"] == 3
        assert stats["highest_mood"] == 5
        assert stats["lowest_mood"] == 1
    
    def test_get_mood_statistics_week_count(self, db, test_user):
        """Count logs in current week"""
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        create_mood_log(db, test_user.user_id, mood_score=3, logged_on=today)
        create_mood_log(db, test_user.user_id, mood_score=4, logged_on=week_ago)
        
        stats = get_mood_statistics(db, test_user.user_id, days=30)
        assert stats["logs_this_week"] >= 1
    
    def test_get_mood_statistics_with_days_filter(self, db, test_user):
        """Filter statistics by days parameter"""
        for i in range(60):
            create_mood_log(
                db, test_user.user_id, mood_score=3,
                logged_on=date.today() - timedelta(days=i)
            )
        
        stats_30 = get_mood_statistics(db, test_user.user_id, days=30)
        stats_60 = get_mood_statistics(db, test_user.user_id, days=60)
        
        assert stats_30["total_logs"] <= 30
        assert stats_60["total_logs"] == 60
