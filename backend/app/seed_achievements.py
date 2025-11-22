from app import models
from app.db import SessionLocal

ACHIEVEMENTS_SEED = [
    {
        "key_name": "first_steps",
        "title": "First Steps",
        "description": "Created your first habit",
        "icon": "🌱",
        "points": 10,
        "requirements": [
            {"requirement_type": "habit_count", "target_value": 1, "unit": "habits"}
        ],
    },
    {
        "key_name": "streak_master",
        "title": "Streak Master",
        "description": "Maintained a 7-day streak",
        "icon": "🔥",
        "points": 25,
        "requirements": [
            {"requirement_type": "streak_days", "target_value": 7, "unit": "days"}
        ],
    },
    {
        "key_name": "gratitude_pro",
        "title": "Gratitude Pro",
        "description": "Logged 10 gratitude entries",
        "icon": "🙏",
        "points": 20,
        "requirements": [
            {
                "requirement_type": "gratitude_entries",
                "target_value": 10,
                "unit": "entries",
            }
        ],
    },
    {
        "key_name": "consistency_king",
        "title": "Consistency King",
        "description": "Tracked habits for 30 days",
        "icon": "👑",
        "points": 50,
        "requirements": [
            {"requirement_type": "days_tracked", "target_value": 30, "unit": "days"}
        ],
    },
    {
        "key_name": "wellness_warrior",
        "title": "Wellness Warrior",
        "description": "Completed 100 habit checkmarks",
        "icon": "⚔️",
        "points": 75,
        "requirements": [
            {
                "requirement_type": "total_completions",
                "target_value": 100,
                "unit": "completions",
            }
        ],
    },
    {
        "key_name": "mood_tracker",
        "title": "Mood Tracker",
        "description": "Logged mood 20 times",
        "icon": "😊",
        "points": 20,
        "requirements": [
            {"requirement_type": "mood_logs", "target_value": 20, "unit": "logs"}
        ],
    },
    {
        "key_name": "habit_collector",
        "title": "Habit Collector",
        "description": "Created 10 different habits",
        "icon": "📚",
        "points": 30,
        "requirements": [
            {"requirement_type": "total_habits", "target_value": 10, "unit": "habits"}
        ],
    },
]


def seed_achievements():
    db = SessionLocal()
    try:
        existing = db.query(models.Achievement).count()
        if existing > 0:
            print(f"✓ Achievements already seeded ({existing} records)")
            # Still create UserAchievement records if they don't exist
            users = db.query(models.User).all()
            achievements = db.query(models.Achievement).all()

            for user in users:
                for achievement in achievements:
                    existing_ua = (
                        db.query(models.UserAchievement)
                        .filter(
                            models.UserAchievement.user_id == user.user_id,
                            models.UserAchievement.achievement_id
                            == achievement.achievement_id,
                        )
                        .first()
                    )

                    if not existing_ua:
                        ua = models.UserAchievement(
                            user_id=user.user_id,
                            achievement_id=achievement.achievement_id,
                            is_earned=False,
                            progress=0,
                            progress_unit_value=0,
                        )
                        db.add(ua)
            db.commit()
            print("✓ UserAchievement records created!")
            return

        for achievement_data in ACHIEVEMENTS_SEED:
            requirements_data = achievement_data.pop("requirements")
            achievement = models.Achievement(**achievement_data)
            db.add(achievement)
            db.flush()

            for req_data in requirements_data:
                requirement = models.AchievementRequirement(
                    achievement_id=achievement.achievement_id, **req_data
                )
                db.add(requirement)

        db.commit()
        print(f"✓ Successfully seeded {len(ACHIEVEMENTS_SEED)} achievements!")
    except Exception as e:
        db.rollback()
        print(f"✗ Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_achievements()