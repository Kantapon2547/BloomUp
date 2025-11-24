import sys
import os
os.environ["TESTING"] = "1"
from pathlib import Path

# backend path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.sqlite import base as sqlite_base

# SQLite
original_process = sqlite_base.SQLiteTypeCompiler.process

def patched_process(self, type_, **kw):
    if isinstance(type_, JSONB):
        return self.process(JSON(), **kw)
    return original_process(self, type_, **kw)

sqlite_base.SQLiteTypeCompiler.process = patched_process

# Create test database engine
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.db import Base, get_db
from app import models
from app.security import hash_password, create_access_token
from app.main import app
from app.utils.timezone_utils import get_bangkok_today
from fastapi.testclient import TestClient


@pytest.fixture(scope="function")
def db():
    """Create test database and tables"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Create test client with test database"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create test user"""
    user = models.User(
        email="test@example.com",
        name="Test User",
        password_hash=hash_password("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user2(db):
    """Create second test user"""
    user = models.User(
        email="test2@example.com",
        name="Test User 2",
        password_hash=hash_password("password456"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_token(test_user):
    """Create JWT token for test user"""
    return create_access_token(subject=test_user.email)


@pytest.fixture
def test_category(db, test_user):
    """Create test habit category"""
    category = models.HabitCategory(
        user_id=test_user.user_id,
        category_name="Test Category",
        color="#ff0000",
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@pytest.fixture
def test_habit(db, test_user, test_category):
    """Create test habit"""
    habit = models.Habit(
        user_id=test_user.user_id,
        habit_name="Morning Exercise",
        category_id=test_category.category_id,
        emoji="🏃",
        duration_minutes=30,
        start_date=get_bangkok_today(),
        best_streak=0,
        is_active=True,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit