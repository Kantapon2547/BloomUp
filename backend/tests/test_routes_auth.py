import pytest


class TestSignupRoute:
    """Tests for /auth/signup endpoint"""
    
    def test_signup_success(self, client):
        """Signup creates user and returns user data"""
        response = client.post(
            "/auth/signup",
            json={
                "email": "newuser@example.com",
                "name": "New User",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        assert response.json()["email"] == "newuser@example.com"
        assert response.json()["name"] == "New User"
    
    def test_signup_duplicate_email(self, client, test_user):
        """Signup rejects duplicate email"""
        response = client.post(
            "/auth/signup",
            json={
                "email": "test@example.com",
                "name": "Duplicate",
                "password": "password123",
            },
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]
    
    def test_signup_with_bio(self, client):
        """Signup with optional bio field"""
        response = client.post(
            "/auth/signup",
            json={
                "email": "biouser@example.com",
                "name": "Bio User",
                "password": "password123",
                "bio": "This is my bio",
            },
        )
        assert response.status_code == 200
        assert response.json()["bio"] == "This is my bio"
    
    def test_signup_missing_required_fields(self, client):
        """Signup rejects missing required fields"""
        response = client.post(
            "/auth/signup",
            json={
                "email": "incomplete@example.com",
                "name": "Incomplete",
            },
        )
        assert response.status_code == 422


class TestLoginRoute:
    """Tests for /auth/login endpoint"""
    
    def test_login_success(self, client, test_user):
        """Login returns valid token"""
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        assert response.status_code == 200
        assert "token" in response.json()
        assert response.json()["token_type"] == "bearer"
    
    def test_login_invalid_email(self, client):
        """Login with non-existent email"""
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]
    
    def test_login_invalid_password(self, client, test_user):
        """Login with wrong password"""
        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]
    
    def test_login_token_is_usable(self, client, test_user):
        """Returned token can be used for authenticated requests"""
        login_response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = login_response.json()["token"]
        
        me_response = client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_response.status_code == 200
    
    def test_login_multiple_users(self, client, test_user, test_user2):
        """Login works for different users"""
        response1 = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )
        response2 = client.post(
            "/auth/login",
            json={"email": "test2@example.com", "password": "password456"},
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.json()["token"] != response2.json()["token"]
