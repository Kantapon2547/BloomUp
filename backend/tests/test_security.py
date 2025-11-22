"""
Tests for security.py module
Tests password hashing, token creation, and JWT operations
"""
import pytest
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)
from fastapi import HTTPException


class TestPasswordHashing:
    """Tests for password hashing functions"""
    
    def test_hash_password_creates_different_hash(self):
        """Verify hashing produces different output each time"""
        password = "mypassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2
        assert len(hash1) > 20
    
    def test_hash_password_correct(self):
        """Verify correct password passes verification"""
        password = "mypassword123"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True
    
    def test_hash_password_incorrect(self):
        """Verify incorrect password fails verification"""
        password = "mypassword123"
        hashed = hash_password(password)
        assert verify_password("wrongpassword", hashed) is False
    
    def test_hash_password_type_error(self):
        """Verify non-string password raises TypeError"""
        with pytest.raises(TypeError):
            hash_password(12345)
    
    def test_verify_password_type_error_password(self):
        """Verify non-string password in verify raises TypeError"""
        hashed = hash_password("password")
        with pytest.raises(TypeError):
            verify_password(12345, hashed)
    
    def test_verify_password_type_error_hash(self):
        """Verify non-string hash in verify raises TypeError"""
        with pytest.raises(TypeError):
            verify_password("password", 12345)
    
    def test_hash_password_very_long(self):
        """Verify very long passwords are rejected"""
        long_password = "a" * 100
        with pytest.raises(ValueError):
            hash_password(long_password)


class TestTokenCreation:
    """Tests for JWT token creation"""
    
    def test_create_access_token_success(self):
        """Verify token creation succeeds"""
        email = "test@example.com"
        token = create_access_token(email)
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_is_decodable(self):
        """Verify created token can be decoded"""
        email = "test@example.com"
        token = create_access_token(email)
        decoded = decode_token(token)
        assert decoded == email
    
    def test_create_access_token_different_subjects(self):
        """Verify different subjects create different tokens"""
        token1 = create_access_token("user1@example.com")
        token2 = create_access_token("user2@example.com")
        assert token1 != token2


class TestTokenDecoding:
    """Tests for JWT token decoding"""
    
    def test_decode_token_valid(self):
        """Verify valid token decodes correctly"""
        email = "test@example.com"
        token = create_access_token(email)
        decoded = decode_token(token)
        assert decoded == email
    
    def test_decode_token_invalid(self):
        """Verify invalid token raises HTTPException"""
        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid.token.here")
        assert exc_info.value.status_code == 401
    
    def test_decode_token_malformed(self):
        """Verify malformed token raises HTTPException"""
        with pytest.raises(HTTPException) as exc_info:
            decode_token("not_a_token")
        assert exc_info.value.status_code == 401
    
    def test_decode_token_empty(self):
        """Verify empty token raises HTTPException"""
        with pytest.raises(HTTPException) as exc_info:
            decode_token("")
        assert exc_info.value.status_code == 401
        