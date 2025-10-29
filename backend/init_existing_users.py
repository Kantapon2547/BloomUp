from app import models
from app.db import SessionLocal
from app.services.achievement_checker import initialize_user_achievements

db = SessionLocal()
try:
    users = db.query(models.User).all()
    for user in users:
        # Check if user already has achievements
        existing = (
            db.query(models.UserAchievement)
            .filter(models.UserAchievement.user_id == user.user_id)
            .first()
        )

        if not existing:
            print(f"Initializing achievements for user: {user.email}")
            initialize_user_achievements(db, user.user_id)

    print("✓ All existing users initialized with achievements!")
finally:
    db.close()
