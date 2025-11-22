import pytest
from app.crud import get_user_by_email


class TestGetUserByEmail:
    """Tests for get_user_by_email function"""
    
    def test_get_user_by_email_exists(self, db, test_user):
        """Retrieve existing user by email"""
        user = get_user_by_email(db, "test@example.com")
        assert user is not None
        assert user.email == "test@example.com"
        assert user.user_id == test_user.user_id
    
    def test_get_user_by_email_not_exists(self, db):
        """Return None for non-existent email"""
        user = get_user_by_email(db, "nonexistent@example.com")
        assert user is None
    
    def test_get_user_by_email_case_sensitive(self, db, test_user):
        """Email lookup is case sensitive"""
        user = get_user_by_email(db, "TEST@EXAMPLE.COM")
        assert user is None
    
    def test_get_user_by_email_returns_correct_user(self, db, test_user, test_user2):
        """Returns correct user when multiple users exist"""
        user = get_user_by_email(db, "test2@example.com")
        assert user is not None
        assert user.user_id == test_user2.user_id
        assert user.email == "test2@example.com"
    
    def test_get_user_by_email_with_special_characters(self, db):
        """Handle emails with special characters"""
        from app import models
        from app.security import hash_password
        
        special_email = "user+tag@example.com"
        user = models.User(
            email=special_email,
            name="Special User",
            password_hash=hash_password("password"),
        )
        db.add(user)
        db.commit()
        
        found = get_user_by_email(db, special_email)
        assert found is not None
        assert found.email == special_email
