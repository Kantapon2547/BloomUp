from sqlalchemy import Column, String, Text
from .db import Base

class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False) 
    bio = Column(Text, nullable=True)
    profile_picture = Column(String, nullable=True)
