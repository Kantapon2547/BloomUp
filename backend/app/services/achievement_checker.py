from datetime import date, timedelta

from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from .. import models


def initialize_user_achievements(db: Session, user_id: int):
    """
    Initialize all achievements for a new user.
    Creates user_achievement records with progress = 0.
    """
    achievements = db.query(models.Achievement).all()

    for achievement in achievements:
        existing = (
            db.query(models.UserAchievement)
            .filter(
                models.UserAchievement.user_id == user_id,
                models.UserAchievement.achievement_id == achievement.achievement_id,
            )
            .first()
        )

        if not existing:
            user_achievement = models.UserAchievement(
                user_id=user_id,
                achievement_id=achievement.achievement_id,
                progress=0,
                progress_unit_value=0,
                is_earned=False,
            )
            db.add(user_achievement)

    db.commit()


def check_gratitude_achievements(db: Session, user_id: int):
    """
    Check and update gratitude-related achievements.
    """
    # Get gratitude entry count
    gratitude_count = (
        db.query(models.GratitudeEntry)
        .filter(models.GratitudeEntry.user_id == user_id)
        .count()
    )

    # Check Gratitude Pro (10 entries)
    gratitude_pro = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == user_id,
            models.UserAchievement.achievement.has(
                models.Achievement.key_name == "gratitude_pro"
            ),
        )
        .first()
    )

    if gratitude_pro:
        progress = min((gratitude_count / 10) * 100, 100)
        gratitude_pro.progress = int(progress)
        gratitude_pro.progress_unit_value = gratitude_count

        if gratitude_count >= 10 and not gratitude_pro.is_earned:
            gratitude_pro.is_earned = True
            gratitude_pro.earned_date = func.now()

    db.commit()


def check_habit_achievements(db: Session, user_id: int):
    """
    Check and update habit-related achievements.
    """
    # Get active habits count
    habit_count = (
        db.query(models.Habit)
        .filter(models.Habit.user_id == user_id, models.Habit.is_active == True)
        .count()
    )

    # Check First Steps (1 habit created)
    first_steps = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == user_id,
            models.UserAchievement.achievement.has(
                models.Achievement.key_name == "first_steps"
            ),
        )
        .first()
    )

    if first_steps:
        progress = min((habit_count / 1) * 100, 100)
        first_steps.progress = int(progress)
        first_steps.progress_unit_value = habit_count

        if habit_count >= 1 and not first_steps.is_earned:
            first_steps.is_earned = True
            first_steps.earned_date = func.now()

    # Check Habit Collector (10 habits)
    habit_collector = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == user_id,
            models.UserAchievement.achievement.has(
                models.Achievement.key_name == "habit_collector"
            ),
        )
        .first()
    )

    if habit_collector:
        progress = min((habit_count / 10) * 100, 100)
        habit_collector.progress = int(progress)
        habit_collector.progress_unit_value = habit_count

        if habit_count >= 10 and not habit_collector.is_earned:
            habit_collector.is_earned = True
            habit_collector.earned_date = func.now()

    db.commit()


def check_streak_achievements(db: Session, user_id: int):
    """
    Check and update streak-related achievements.
    """
    # Get all habit completions for user, sorted by date
    completions = (
        db.query(models.HabitCompletion)
        .filter(models.HabitCompletion.user_id == user_id)
        .order_by(models.HabitCompletion.completed_on.desc())
        .all()
    )

    if not completions:
        return

    # Calculate current streak
    current_streak = 0
    check_date = date.today()

    for completion in completions:
        if completion.completed_on == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        elif completion.completed_on < check_date:
            break

    # Check Streak Master (7-day streak)
    streak_master = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == user_id,
            models.UserAchievement.achievement.has(
                models.Achievement.key_name == "streak_master"
            ),
        )
        .first()
    )

    if streak_master:
        progress = min((current_streak / 7) * 100, 100)
        streak_master.progress = int(progress)
        streak_master.progress_unit_value = current_streak

        if current_streak >= 7 and not streak_master.is_earned:
            streak_master.is_earned = True
            streak_master.earned_date = func.now()

    db.commit()


def check_mood_achievements(db: Session, user_id: int):
    """
    Check and update mood-related achievements.
    """
    # Get mood log count
    mood_count = (
        db.query(models.MoodLog).filter(models.MoodLog.user_id == user_id).count()
    )

    # Check Mood Tracker (20 mood logs)
    mood_tracker = (
        db.query(models.UserAchievement)
        .filter(
            models.UserAchievement.user_id == user_id,
            models.UserAchievement.achievement.has(
                models.Achievement.key_name == "mood_tracker"
            ),
        )
        .first()
    )

    if mood_tracker:
        progress = min((mood_count / 20) * 100, 100)
        mood_tracker.progress = int(progress)
        mood_tracker.progress_unit_value = mood_count

        if mood_count >= 20 and not mood_tracker.is_earned:
            mood_tracker.is_earned = True
            mood_tracker.earned_date = func.now()

    db.commit()


def check_all_achievements(db: Session, user_id: int):
    """
    Check all achievements for a user.
    """
    check_gratitude_achievements(db, user_id)
    check_habit_achievements(db, user_id)
    check_streak_achievements(db, user_id)
    check_mood_achievements(db, user_id)
