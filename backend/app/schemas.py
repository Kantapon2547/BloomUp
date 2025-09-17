from pydantic import BaseModel, EmailStr, Field

class ItemCreate(BaseModel):
    title: str
    done: bool = False

class ItemRead(BaseModel):
    id: int
    title: str
    done: bool
    class Config:
        from_attributes = True

# Users
class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

class UserRead(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    class Config:
        from_attributes = True
