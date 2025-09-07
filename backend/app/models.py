from sqlalchemy import Column, Integer, String, Boolean
from .db import Base

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    done = Column(Boolean, default=False)
