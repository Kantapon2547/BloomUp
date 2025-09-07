from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/items", tags=["items"])

@router.get("/", response_model=list[schemas.ItemRead])
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).order_by(models.Item.id).all()

@router.post("/", response_model=schemas.ItemRead, status_code=201)
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = models.Item(title=payload.title, done=payload.done)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.patch("/{item_id}", response_model=schemas.ItemRead)
def update_item(item_id: int, payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = db.query(models.Item).get(item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    item.title = payload.title
    item.done = payload.done
    db.commit()
    db.refresh(item)
    return item
