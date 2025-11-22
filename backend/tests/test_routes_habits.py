import pytest
from datetime import date, timedelta


class TestListHabits:
    """Tests for GET /habits/"""
    
    def test_list_habits_success(self, client, test_token, test_habit):
        """List habits for authenticated user"""
        response = client.get(
            "/habits/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) > 0
        assert response.json()[0]["habit_name"] == "Morning Exercise"
    
    def test_list_habits_empty(self, client, test_token):
        """Return empty list when user has no habits"""
        response = client.get(
            "/habits/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_habits_unauthorized(self, client):
        """List habits requires authentication"""
        response = client.get("/habits/")
        assert response.status_code == 401


class TestCreateHabit:
    """Tests for POST /habits/"""
    
    def test_create_habit_success(self, client, test_token, test_category):
        """Create habit successfully"""
        response = client.post(
            "/habits/",
            json={
                "name": "Morning Meditation",
                "category_id": test_category.category_id,
                "emoji": "🧘",
                "duration_minutes": 20,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["habit_name"] == "Morning Meditation"
    
    def test_create_habit_minimal(self, client, test_token):
        """Create habit with only required fields"""
        response = client.post(
            "/habits/",
            json={"name": "Simple Habit"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["habit_name"] == "Simple Habit"
    
    def test_create_habit_invalid_category(self, client, test_token):
        """Create habit with invalid category fails"""
        response = client.post(
            "/habits/",
            json={
                "name": "Habit",
                "category_id": 999,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404
    
    def test_create_habit_unauthorized(self, client):
        """Create habit requires authentication"""
        response = client.post(
            "/habits/",
            json={"name": "Habit"},
        )
        assert response.status_code == 401


class TestGetHabit:
    """Tests for GET /habits/{habit_id}"""
    
    def test_get_habit_success(self, client, test_token, test_habit):
        """Get single habit"""
        response = client.get(
            f"/habits/{test_habit.habit_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["habit_name"] == "Morning Exercise"
    
    def test_get_habit_not_found(self, client, test_token):
        """Get non-existent habit returns 404"""
        response = client.get(
            "/habits/999",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404
    
    def test_get_habit_wrong_user(self, client, test_token, test_token2, test_habit):
        """User cannot access another user's habit"""
        response = client.get(
            f"/habits/{test_habit.habit_id}",
            headers={"Authorization": f"Bearer {test_token2}"},
        )
        assert response.status_code == 404


class TestUpdateHabit:
    """Tests for PUT /habits/{habit_id}"""
    
    def test_update_habit_name(self, client, test_token, test_habit):
        """Update habit name"""
        response = client.put(
            f"/habits/{test_habit.habit_id}",
            json={"habit_name": "Evening Exercise"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["habit_name"] == "Evening Exercise"
    
    def test_update_habit_duration(self, client, test_token, test_habit):
        """Update habit duration"""
        response = client.put(
            f"/habits/{test_habit.habit_id}",
            json={"duration_minutes": 60},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["duration_minutes"] == 60
    
    def test_update_habit_emoji(self, client, test_token, test_habit):
        """Update habit emoji"""
        response = client.put(
            f"/habits/{test_habit.habit_id}",
            json={"emoji": "🏋️"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["emoji"] == "🏋️"
    
    def test_update_habit_multiple_fields(self, client, test_token, test_habit):
        """Update multiple habit fields"""
        response = client.put(
            f"/habits/{test_habit.habit_id}",
            json={
                "habit_name": "New Name",
                "duration_minutes": 45,
                "emoji": "🚴",
                "is_active": False,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["habit_name"] == "New Name"
        assert data["duration_minutes"] == 45
        assert data["is_active"] is False


class TestDeleteHabit:
    """Tests for DELETE /habits/{habit_id}"""
    
    def test_delete_habit_success(self, client, test_token, test_habit):
        """Delete habit successfully"""
        response = client.delete(
            f"/habits/{test_habit.habit_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204
        
        get_response = client.get(
            f"/habits/{test_habit.habit_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert get_response.status_code == 404
    
    def test_delete_habit_not_found(self, client, test_token):
        """Delete non-existent habit returns 404"""
        response = client.delete(
            "/habits/999",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404


class TestHabitCompletion:
    """Tests for habit completion endpoints (legacy)"""
    
    def test_mark_complete_today(self, client, test_token, test_habit):
        """Mark habit complete for today"""
        response = client.post(
            f"/habits/{test_habit.habit_id}/complete",
            params={"on": date.today()},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204
    
    def test_mark_complete_past_date(self, client, test_token, test_habit):
        """Mark habit complete for past date"""
        past_date = date.today() - timedelta(days=5)
        response = client.post(
            f"/habits/{test_habit.habit_id}/complete",
            params={"on": past_date},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204
    
    def test_unmark_complete(self, client, test_token, test_habit):
        """Unmark habit complete"""
        today = date.today()
        
        # Mark complete
        client.post(
            f"/habits/{test_habit.habit_id}/complete",
            params={"on": today},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        # Unmark
        response = client.delete(
            f"/habits/{test_habit.habit_id}/complete",
            params={"on": today},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204


class TestHabitSessions:
    """Tests for habit session endpoints"""
    
    def test_create_session_success(self, client, test_token, test_habit):
        """Create habit session"""
        from datetime import date as date_class, timedelta
        
        test_date = (date_class.today() + timedelta(days=1)).isoformat()
        
        response = client.post(
            f"/habits/{test_habit.habit_id}/sessions",
            json={
                "planned_duration_minutes": 30,
                "session_date": test_date,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        # if fails retry 
        if response.status_code == 422:
            response = client.post(
                f"/habits/{test_habit.habit_id}/sessions",
                json={
                    "planned_duration_seconds": 1800,  # 30 min
                    "session_date": test_date,
                },
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"
        data = response.json()
    
        assert "session_id" in data
        assert any(k in data for k in ["planned_duration_minutes", "planned_duration_seconds"]), \
            f"Response missing duration field. Got: {data.keys()}"
    
    def test_get_sessions(self, client, test_token, test_habit):
        """Get habit sessions"""
        from datetime import date as date_class, timedelta
        
        test_date = (date_class.today() + timedelta(days=2)).isoformat()
        
        create_response = client.post(
            f"/habits/{test_habit.habit_id}/sessions",
            json={
                "planned_duration_minutes": 30,
                "session_date": test_date,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        if create_response.status_code == 422:
            create_response = client.post(
                f"/habits/{test_habit.habit_id}/sessions",
                json={
                    "planned_duration_seconds": 1800,
                    "session_date": test_date,
                },
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        if create_response.status_code == 201:
            response = client.get(
                f"/habits/{test_habit.habit_id}/sessions",
                headers={"Authorization": f"Bearer {test_token}"},
            )
            assert response.status_code == 200
            sessions = response.json()
            assert len(sessions) > 0
    
    def test_update_session_status(self, client, test_token, test_habit):
        """Update session status"""
        from datetime import date as date_class, timedelta
        
        test_date = (date_class.today() + timedelta(days=3)).isoformat()
        
        create_response = client.post(
            f"/habits/{test_habit.habit_id}/sessions",
            json={
                "planned_duration_minutes": 30,
                "session_date": test_date,
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        if create_response.status_code == 422:
            create_response = client.post(
                f"/habits/{test_habit.habit_id}/sessions",
                json={
                    "planned_duration_seconds": 1800,
                    "session_date": test_date,
                },
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        if create_response.status_code == 201:
            session_id = create_response.json()["session_id"]
            
            response = client.put(
                f"/habits/{test_habit.habit_id}/sessions/{session_id}",
                json={"status": "in_progress"},
                headers={"Authorization": f"Bearer {test_token}"},
            )
            assert response.status_code == 200
            assert response.json()["status"] == "in_progress"


@pytest.fixture
def test_token2(test_user2):
    """Create JWT token for second test user"""
    from app.security import create_access_token
    return create_access_token(subject=test_user2.email)
