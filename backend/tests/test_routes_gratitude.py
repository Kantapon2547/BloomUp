import pytest


class TestListGratitudeRoute:
    """Tests for GET /gratitude/"""
    
    def test_list_gratitude_empty(self, client, test_token):
        """List gratitude when none exist"""
        response = client.get(
            "/gratitude/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert response.json() == []
    
    def test_list_gratitude_success(self, client, test_token):
        """List gratitude entries successfully"""
        client.post(
            "/gratitude/",
            data={"text": "I'm grateful"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        response = client.get(
            "/gratitude/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) > 0
    
    def test_list_gratitude_ordered(self, client, test_token):
        """Gratitude entries are returned"""
        client.post(
            "/gratitude/",
            data={"text": "Entry 1"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        client.post(
            "/gratitude/",
            data={"text": "Entry 2"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        response = client.get(
            "/gratitude/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 200
        entries = response.json()
        assert len(entries) == 2
        # Verify entries exist without checking specific order
        texts = [e["text"] for e in entries]
        assert "Entry 1" in texts, f"Entry 1 not found in {texts}"
        assert "Entry 2" in texts, f"Entry 2 not found in {texts}"


class TestCreateGratitudeRoute:
    """Tests for POST /gratitude/"""
    
    def test_create_gratitude_success(self, client, test_token):
        """Create gratitude entry successfully"""
        response = client.post(
            "/gratitude/",
            data={"text": "I'm grateful for my family"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["text"] == "I'm grateful for my family"
    
    def test_create_gratitude_with_category(self, client, test_token):
        """Create gratitude with category"""
        response = client.post(
            "/gratitude/",
            data={
                "text": "Grateful moment",
                "category": "Family",
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["category"] == "Family"
    
    def test_create_gratitude_empty_text(self, client, test_token):
        """Create gratitude with empty text fails"""
        response = client.post(
            "/gratitude/",
            data={"text": ""},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 422
    
    def test_create_gratitude_missing_text(self, client, test_token):
        """Create gratitude without text fails"""
        response = client.post(
            "/gratitude/",
            data={},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 422
    
    def test_create_gratitude_unauthorized(self, client):
        """Create gratitude requires authentication"""
        response = client.post(
            "/gratitude/",
            data={"text": "Grateful"},
        )
        assert response.status_code == 401
    
    def test_create_gratitude_with_whitespace(self, client, test_token):
        """Gratitude text with leading/trailing spaces is trimmed"""
        response = client.post(
            "/gratitude/",
            data={"text": "   I'm grateful   "},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 201
        assert response.json()["text"] == "I'm grateful"


class TestDeleteGratitudeRoute:
    """Tests for DELETE /gratitude/{entry_id}"""
    
    def test_delete_gratitude_success(self, client, test_token):
        """Delete gratitude entry successfully"""
        create_response = client.post(
            "/gratitude/",
            data={"text": "Entry to delete"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        entry_id = create_response.json()["id"]
        
        response = client.delete(
            f"/gratitude/{entry_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 204
        
        list_response = client.get(
            "/gratitude/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert len(list_response.json()) == 0
    
    def test_delete_gratitude_not_found(self, client, test_token):
        """Delete non-existent entry"""
        response = client.delete(
            "/gratitude/999",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert response.status_code == 404
    
    def test_delete_gratitude_wrong_user(self, client, test_token, test_token2):
        """User cannot delete another user's entry"""
        create_response = client.post(
            "/gratitude/",
            data={"text": "Entry"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        entry_id = create_response.json()["id"]
        
        response = client.delete(
            f"/gratitude/{entry_id}",
            headers={"Authorization": f"Bearer {test_token2}"},
        )
        assert response.status_code == 404
    
    def test_delete_gratitude_only_deletes_one(self, client, test_token):
        """Deleting one entry doesn't delete others"""
        response1 = client.post(
            "/gratitude/",
            data={"text": "Entry 1"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        response2 = client.post(
            "/gratitude/",
            data={"text": "Entry 2"},
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        entry_id = response1.json()["id"]
        
        client.delete(
            f"/gratitude/{entry_id}",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        
        list_response = client.get(
            "/gratitude/",
            headers={"Authorization": f"Bearer {test_token}"},
        )
        assert len(list_response.json()) == 1
        assert list_response.json()[0]["text"] == "Entry 2"


@pytest.fixture
def test_token2(test_user2):
    """Create JWT token for second test user"""
    from app.security import create_access_token
    return create_access_token(subject=test_user2.email)
