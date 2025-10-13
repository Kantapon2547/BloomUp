from pydantic import BaseModel, EmailStr, Field, ConfigDict, computed_field
from typing import Optional, Dict
from datetime import date


# User
class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str 

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    password: Optional[str] = None

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Habit
class HabitBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: Optional[str] = "general"
    is_active: bool = True

class HabitCreate(BaseModel):
    name: str
    category: str = "general"
    is_active: bool = True

class HabitCompletionOut(BaseModel):
    completed_on: date 
    model_config = ConfigDict(from_attributes=True)

class HabitOut(BaseModel):
    habit_id: int
    user_id: int
    name: str = Field(validation_alias="habit_name")
    category: str = Field(validation_alias="category_id")
    start_date: date
    end_date: Optional[date] = None
    best_streak: int
    is_active: bool
    history: Dict[str, bool] = Field(default_factory=dict)
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# Gratitude
class GratitudeEntryCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    category: Optional[str] = None

class GratitudeEntryOut(BaseModel):
    id: int = Field(validation_alias="gratitude_id")
    text: str = Field(validation_alias="body")
    category: Optional[str] = None
    date: str  # formatted as local date string
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)