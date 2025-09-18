from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str   # raw password when creating

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
