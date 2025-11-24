import pytest
from datetime import date, timedelta


class TestCreateMoodRoute:
    """Tests for POST /mood/"""
    
    def test_create_mood_success(self, client, test_token):
        """Create mood log successfully"""
        response = client.post(
            "/mood/",
            json={"mood_score": 3},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["mood_score"] == 3
    
    def test_create_mood_with_note(self, client, test_token):
        """Create mood with note"""
        response = client.post(
            "/mood/",
            json={"mood_score": 5, "note": "Had a great day!"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["note"] == "Had a great day!"
    
    def test_create_mood_specific_date(self, client, test_token):
        """Create mood for specific date"""
        past_date = date.today() - timedelta(days=2)
        response = client.post(
            "/mood/",
            json={
                "mood_score": 1,
                "logged_on": str(past_date),
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
    
    def test_create_mood_invalid_score_low(self, client, test_token):
        """Create mood with invalid low score"""
        response = client.post(
            "/mood/",
            json={"mood_score": 0},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 422
    
    def test_create_mood_invalid_score_high(self, client, test_token):
        """Create mood with invalid high score"""
        response = client.post(
            "/mood/",
            json={"mood_score": 11},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 422
    
    def test_create_mood_duplicate_date(self, client, test_token):
        """Cannot create duplicate mood for same date"""
        client.post(
            "/mood/",
            json={"mood_score": 2},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        response = client.post(
            "/mood/",
            json={"mood_score": 4},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 400


class TestListMoodsRoute:
    """Tests for GET /mood/"""
    
    def test_list_moods_empty(self, client, test_token):
        """List moods when none exist"""
        response = client.get(
            "/mood/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_moods_success(self, client, test_token):
        """List moods successfully"""
        client.post(
            "/mood/",
            json={"mood_score": 3},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        response = client.get(
            "/mood/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) > 0
    
    def test_list_moods_with_limit(self, client, test_token):
        """List moods with limit"""
        for i in range(5):
            client.post(
                "/mood/",
                json={"mood_score": 1 + i, "logged_on": str(date.today() - timedelta(days=i))},
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        response = client.get(
            "/mood/?limit=2",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 2


class TestGetMoodRoute:
    """Tests for GET /mood/{mood_id}"""
    
    def test_get_mood_success(self, client, test_token):
        """Get single mood"""
        create_response = client.post(
            "/mood/",
            json={"mood_score": 5},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        mood_id = create_response.json()["mood_id"]
        
        response = client.get(
            f"/mood/{mood_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["mood_score"] == 5
    
    def test_get_mood_not_found(self, client, test_token):
        """Get non-existent mood"""
        response = client.get(
            "/mood/999",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404


class TestUpdateMoodRoute:
    """Tests for PUT /mood/{mood_id}"""
    
    def test_update_mood_score(self, client, test_token):
        """Update mood score"""
        create_response = client.post(
            "/mood/",
            json={"mood_score": 5},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        mood_id = create_response.json()["mood_id"]
        
        response = client.put(
            f"/mood/{mood_id}",
            json={"mood_score": 2},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["mood_score"] == 2
    
    def test_update_mood_note(self, client, test_token):
        """Update mood note"""
        create_response = client.post(
            "/mood/",
            json={"mood_score": 5},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        mood_id = create_response.json()["mood_id"]
        
        response = client.put(
            f"/mood/{mood_id}",
            json={"note": "Great day!"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200


class TestDeleteMoodRoute:
    """Tests for DELETE /mood/{mood_id}"""
    
    def test_delete_mood_success(self, client, test_token):
        """Delete mood successfully"""
        create_response = client.post(
            "/mood/",
            json={"mood_score": 3},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        mood_id = create_response.json()["mood_id"]
        
        response = client.delete(
            f"/mood/{mood_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204
    
    def test_delete_mood_not_found(self, client, test_token):
        """Delete non-existent mood"""
        response = client.delete(
            "/mood/999",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404


class TestMoodStatsRoute:
    """Tests for GET /mood/stats"""
    
    def test_get_mood_stats(self, client, test_token):
        """Get mood statistics"""
        for score in [1, 2, 3, 4, 5]:
            client.post(
                "/mood/",
                json={"mood_score": score, "logged_on": str(date.today() - timedelta(days=4))},
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        response = client.get(
            "/mood/stats",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        stats = response.json()
        assert "average_mood" in stats
        assert "total_logs" in stats
        assert "highest_mood" in stats
        assert "lowest_mood" in stats


class TestMoodTrendRoute:
    """Tests for GET /mood/trend"""
    
    def test_get_mood_trend(self, client, test_token):
        """Get mood trend data"""
        for i in range(7):
            client.post(
                "/mood/",
                json={"mood_score": 1 + i, "logged_on": str(date.today() - timedelta(days=i))},
                headers={"Authorization": f"Bearer {test_token}"},
            )
        
        response = client.get(
            "/mood/trend",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) > 0


class TestGetTodayMoodRoute:
    """Tests for GET /mood/today"""
    
    def test_get_today_mood_exists(self, client, test_token):
        """Get today's mood when it exists"""
        client.post(
            "/mood/",
            json={"mood_score": 3},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        response = client.get(
            "/mood/today",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json()["mood_score"] == 3
    
    def test_get_today_mood_not_exists(self, client, test_token):
        """Get today's mood when none exists"""
        response = client.get(
            "/mood/today",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json() is None
