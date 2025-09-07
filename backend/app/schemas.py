from pydantic import BaseModel

class ItemCreate(BaseModel):
    title: str
    done: bool = False

class ItemRead(BaseModel):
    id: int
    title: str
    done: bool
    class Config:
        from_attributes = True
