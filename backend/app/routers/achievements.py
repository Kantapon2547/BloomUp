from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from typing import List

from .. import schemas, models, crud
from ..db import get_db
from ..security import get_current_email


router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("", response_model=List[schemas.AchievementOut])
def list_achievements(db: Session = Depends(get_db)):
    """Get all available achievements"""
    achievements = db.query(models.Achievement).all()
    return achievements


@router.get("/{achievement_id}", response_model=schemas.AchievementOut)
def get_achievement(achievement_id: int, db: Session = Depends(get_db)):
    """Get a specific achievement by ID"""
    achievement = db.query(models.Achievement).filter(
        models.Achievement.achievement_id == achievement_id
    ).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    return achievement


@router.get("/by-key/{key_name}", response_model=schemas.AchievementOut)
def get_achievement_by_key(key_name: str, db: Session = Depends(get_db)):
    """Get a specific achievement by key name"""
    achievement = db.query(models.Achievement).filter(
        models.Achievement.key_name == key_name
    ).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    return achievement


@router.get("/user/all", response_model=List[schemas.UserAchievementSummary])
def get_user_achievements(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_email)
):
    """Get all achievements for the current user with progress"""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Use joinedload to eager load the achievement relationship
    from sqlalchemy.orm import joinedload
    user_achievements = db.query(models.UserAchievement).options(
        joinedload(models.UserAchievement.achievement)
    ).filter(
        models.UserAchievement.user_id == user.user_id
    ).all()
    
    summaries = []
    for ua in user_achievements:
        summary = schemas.UserAchievementSummary(
            achievement_id=ua.achievement_id,
            title=ua.achievement.title,
            description=ua.achievement.description,
            icon=ua.achievement.icon,
            points=ua.achievement.points,
            is_earned=ua.is_earned,
            earned_date=ua.earned_date,
            progress=ua.progress,
            progress_unit_value=ua.progress_unit_value
        )
        summaries.append(summary)
    
    return summaries


@router.get("/user/earned", response_model=List[schemas.UserAchievementSummary])
def get_earned_achievements(
    db: Session = Depends(get_db),
    email: str = Depends(get_current_email)
):
    """Get only earned achievements for the current user"""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_achievements = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user.user_id,
        models.UserAchievement.is_earned == True
    ).all()
    
    summaries = []
    for ua in user_achievements:
        summary = schemas.UserAchievementSummary(
            achievement_id=ua.achievement_id,
            title=ua.achievement.title,
            description=ua.achievement.description,
            icon=ua.achievement.icon,
            points=ua.achievement.points,
            is_earned=ua.is_earned,
            earned_date=ua.earned_date,
            progress=ua.progress,
            progress_unit_value=ua.progress_unit_value
        )
        summaries.append(summary)
    
    return summaries


@router.post("/user/{achievement_id}/progress", response_model=schemas.UserAchievementOut)
def update_achievement_progress(
    achievement_id: int,
    progress: int = Query(..., ge=0, le=100),
    progress_unit_value: int = Query(0),
    db: Session = Depends(get_db),
    email: str = Depends(get_current_email)
):
    """Update progress for a specific achievement"""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    achievement = db.query(models.Achievement).filter(
        models.Achievement.achievement_id == achievement_id
    ).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    user_achievement = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user.user_id,
        models.UserAchievement.achievement_id == achievement_id
    ).first()
    
    if not user_achievement:
        user_achievement = models.UserAchievement(
            user_id=user.user_id,
            achievement_id=achievement_id,
            progress=progress,
            progress_unit_value=progress_unit_value
        )
        db.add(user_achievement)
    else:
        user_achievement.progress = progress
        user_achievement.progress_unit_value = progress_unit_value
    
    if progress >= 100 and not user_achievement.is_earned:
        user_achievement.is_earned = True
        user_achievement.earned_date = func.now()
    
    db.commit()
    db.refresh(user_achievement)
    return user_achievement


@router.post("/user/{achievement_id}/earn", response_model=schemas.UserAchievementOut)
def earn_achievement(
    achievement_id: int,
    db: Session = Depends(get_db),
    email: str = Depends(get_current_email)
):
    """Manually mark an achievement as earned"""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    achievement = db.query(models.Achievement).filter(
        models.Achievement.achievement_id == achievement_id
    ).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    user_achievement = db.query(models.UserAchievement).filter(
        models.UserAchievement.user_id == user.user_id,
        models.UserAchievement.achievement_id == achievement_id
    ).first()
    
    if not user_achievement:
        user_achievement = models.UserAchievement(
            user_id=user.user_id,
            achievement_id=achievement_id,
            is_earned=True,
            earned_date=func.now(),
            progress=100,
            progress_unit_value=0
        )
        db.add(user_achievement)
    else:
        user_achievement.is_earned = True
        user_achievement.earned_date = func.now()
        user_achievement.progress = 100
    
    db.commit()
    db.refresh(user_achievement)
    return user_achievement
