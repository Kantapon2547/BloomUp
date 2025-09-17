from sqlalchemy import Column, Integer, String, DateTime, func, UniqueConstraint
from .db import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(512))  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
