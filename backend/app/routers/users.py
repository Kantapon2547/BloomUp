from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..security import get_current_user, verify_password, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])

# Read 
@router.get("/me", response_model=schemas.UserRead)
def get_me(me: models.User = Depends(get_current_user)):
    return me

# Update
@router.patch("/me", response_model=schemas.UserRead)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    me: models.User = Depends(get_current_user),
):
    changed = False

    if payload.full_name is not None:
        me.full_name = payload.full_name.strip()
        changed = True

    if payload.avatar_url is not None:
        me.avatar_url = payload.avatar_url.strip()
        changed = True

    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != me.email:
            exists = db.query(models.User).filter(models.User.email == new_email).first()
            if exists:
                raise HTTPException(status_code=409, detail="Email already in use")
            me.email = new_email
            changed = True

    if not changed:
        return me

    db.add(me)
    db.commit()
    db.refresh(me)
    return me

# Change password
@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    me: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, me.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    me.password_hash = hash_password(payload.new_password)
    db.add(me)
    db.commit()
    return

# Delete
@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    db: Session = Depends(get_db),
    me: models.User = Depends(get_current_user),
):
    db.delete(me)
    db.commit()
    return

# admin endpoints
@router.get("/", response_model=list[schemas.UserRead])
def list_users(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    # admin: models.User = Depends(require_admin)
):
    return db.query(models.User).order_by(models.User.id).offset(offset).limit(limit).all()

@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    # admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
