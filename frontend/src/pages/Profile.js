// profile.js
import React, { useState, useEffect, useRef } from "react";
import html2canvas from 'html2canvas';
import { getMyProfile, updateProfile, uploadAvatar } from "../services/userService";
import { getUserAchievements, getEarnedAchievements } from "../services/achievementService";
import { getWeeklyMoodSummary, shouldRefreshWeeklyData, isMoodCardVisible } from "../services/moodService";
  import { getShareableStats } from "../services/statsService";
import { createStorage } from "../services/habitStorage";
import barCard from "../assets/bar_card.png";
import "./style/Profile.css";
import "./style/ShareCard.css";
// Mood images
import mood1 from "../assets/mood_1.png";
import mood2 from "../assets/mood_2.png";
import mood3 from "../assets/mood_3.png";
import mood4 from "../assets/mood_4.png";
import mood5 from "../assets/mood_5.png";

// Constants
const STATS_CONFIG = [
  { key: "activeHabits", icon: "ads_click", label: "ACTIVE HABITS" },
  { key: "longestStreak", icon: "local_fire_department", label: "LONGEST STREAK" },
  { key: "gratitudeEntries", icon: "favorite_border", label: "GRATITUDE ENTRIES" },
  { key: "daysTracked", icon: "calendar_month", label: "DAYS TRACKED" }
];


// Helper Functions
const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
};

const scoreToMoodDisplay = (score) => {
  if (score === 0) return { image: mood1, description: "Not tracked" };
  if (score <= 2) return { image: mood1, description: "Tough Week" };
  if (score <= 4) return { image: mood2, description: "Okay Week" };
  if (score <= 6) return { image: mood3, description: "Good Week" };
  if (score <= 8) return { image: mood4, description: "Great Week" };
  if (score <= 10) return { image: mood5, description: "Amazing Week" };
  return { image: mood1, description: "Not tracked" };
};

// Add mood color mapping function
const getMoodColors = (score) => {
  if (score === 0) return { background: '#cbe4ebff', text: '#2c5282' };
  if (score <= 2) return { background: '#e1f3f9ff', text: '#81b5f5ff' }; 
  if (score <= 4) return { background: '#cff4d4ff', text: '#63c189ff' }; 
  if (score <= 6) return { background: '#fffbcfff', text: '#ffdf6dff' };
  if (score <= 8) return { background: '#fae3c4ff', text: '#f2b96eff' }; 
  if (score <= 10) return { background: '#f7dbe2ff', text: '#ee9fd7ff' }; 
  return { background: '#b6e8f7', text: '#2c5282' }; // Default
};

const formatAchievementRequirement = (achievement) => {
  return achievement.description;
};

// IMPROVED Helper function to calculate weekly average completion rate
const calculateWeeklyCompletionRate = (habit, targetDate = new Date()) => {
  if (!habit || !habit.history) return 0;

  try {
    const today = new Date(targetDate);
    const dayOfWeek = today.getDay();
    
    // Get start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Count completed days in this week
    let completedDays = 0;
    const daysInWeek = 7;

    for (let i = 0; i < daysInWeek; i++) {
      const checkDate = new Date(startOfWeek);
      checkDate.setDate(startOfWeek.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      // Check if habit has completion for this date
      if (habit.history && habit.history[dateStr]) {
        completedDays++;
      }
    }

    const completionRate = Math.round((completedDays / daysInWeek) * 100);
    return completionRate;
  } catch (error) {
    console.error('Error calculating weekly completion rate:', error);
    return 0;
  }
};

// IMPROVED Helper function to get the most recently created habit
const getMostRecentHabit = (habits) => {
  if (!habits || habits.length === 0) return null;
  
  return habits.reduce((mostRecent, current) => {
    const currentDate = new Date(current.created_at || current.createdAt || 0);
    const mostRecentDate = new Date(mostRecent.created_at || mostRecent.createdAt || 0);
    return currentDate > mostRecentDate ? current : mostRecent;
  });
};

const calculateHighestProgressHabit = (habits) => {
  if (!habits || habits.length === 0) return null;
  
  return habits.reduce((highest, current) => {
    const currentProgress = calculateWeeklyCompletionRate(current);
    const highestProgress = calculateWeeklyCompletionRate(highest);
    return currentProgress > highestProgress ? current : highest;
  });
};

// Components
const PageIndicator = ({ count, activeIndex }) => (
  <div className="page-indicator">
    {Array.from({ length: count }).map((_, index) => (
      <span
        key={index}
        className={`dot ${index === activeIndex ? 'active' : ''}`}
      />
    ))}
  </div>
);

const ProfileHeader = ({ profileData, onEditProfileClick, onShareClick, formatMemberSinceDate }) => (
  <div className="profile-card profile-header-card">
    <div className="profile-header-content">
      <div className="profile-image-section">
        <div className="profile-image-container">
          {profileData.profile_picture ? (
            <img src={profileData.profile_picture} alt={profileData.name} className="profile-image" />
          ) : (
            <div className="profile-emoji-default">🌸</div>
          )}
        </div>
        <div className="edit-profile-badge" onClick={onEditProfileClick} title="Edit Profile">
          <span className="material-symbols-outlined">edit</span>
        </div>
      </div>
      <div className="profile-info-section">
        <div className="profile-header-top">
          <h1 className="profile-name-large">{profileData.name}</h1>
          <div className="profile-header-actions">
            <button className="profile-logout-btn" onClick={handleLogout}>
              <span className="material-icons">logout</span> Logout
            </button>
            <button className="profile-share-btn" onClick={onShareClick}>
              <span className="material-icons">share</span> Share
            </button>
          </div>
        </div>
        <p className="profile-bio-text">{profileData.bio || "No bio yet"}</p>
        <div className="profile-tags">
          <div className="member-since-text">Member since {formatMemberSinceDate()}</div>
        </div>
      </div>
    </div>
  </div>
);

const StatsSection = ({ userStats }) => (
  <div className="profile-stats-cards-container">
    <div className="profile-stats-cards-grid">
      {STATS_CONFIG.map(({ key, icon, label }) => (
        <div key={key} className="profile-stat-card">
          <div className="stat-icon"><span className="material-icons">{icon}</span></div>
          <div className="stat-number">{userStats[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const AchievementItem = ({ achievement }) => (
  <div className="achievement-item">
    <div className="achievement-icon">{achievement.icon}</div>
    <div className="achievement-info">
      <div className="achievement-title">{achievement.title}</div>
      <div className="achievement-description">{achievement.description}</div>
    </div>
  </div>
);

const AchievementsCard = ({ userAchievements, earnedAchievementsCount, totalAchievementsCount, onViewAllAchievements }) => (
  <div className="profile-card achievements-card">
    <div className="card-header">
      <h2 className="card-title">Achievements</h2>
      <button className="view-all-btn" onClick={onViewAllAchievements}>
        {earnedAchievementsCount}/{totalAchievementsCount}
      </button>
    </div>
    <div className="achievements-content">
      <div className="achievement-progress">
        <div className="progress-number">{earnedAchievementsCount}/{totalAchievementsCount}</div>
        <div className="progress-label">Total Achievements</div>
      </div>
      <div className="achievements-list">
        {userAchievements.slice(0, 3).map(achievement => 
          <AchievementItem key={achievement.achievement_id} achievement={achievement} />
        )}
      </div>
    </div>
  </div>
);

const ActivityItem = ({ activityItem }) => (
  <div className="activity-item">
    <div className="activity-icon">{activityItem.icon}</div>
    <div className="activity-content">
      <div className="activity-text">{activityItem.text}</div>
      <div className="activity-time">{activityItem.time}</div>
    </div>
  </div>
);

const RecentActivityCard = ({ activities }) => (
  <div className="profile-card activity-card">
    <div className="card-header">
      <h2 className="card-title">Recent Activity</h2>
    </div>
    <div className="activity-list">
      {activities && activities.length > 0 ? (
        activities.map((item, index) => <ActivityItem key={index} activityItem={item} />)
      ) : (
        <div className="no-activity">No recent activity recorded.</div>
      )}
    </div>
  </div>
);

const AchievementModalItem = ({ achievement }) => (
  <div className={`achievement-card ${achievement.is_earned ? 'earned' : 'locked'}`}>
    <div className="achievement-icon-large">
      {achievement.is_earned ? achievement.icon : "🔒"}
    </div>
    <div className="achievement-content">
      <h3 className="achievement-title">{achievement.title}</h3>
      <p className="achievement-description">
        {formatAchievementRequirement(achievement)}
      </p>
      {achievement.is_earned && achievement.earned_date && (
        <div className="achievement-date">
          Earned {new Date(achievement.earned_date).toLocaleDateString('en-GB')}
        </div>
      )}
    </div>
  </div>
);

const AchievementsModal = ({ allAchievements, onCloseModal }) => {
  const earnedCount = allAchievements.filter(a => a.is_earned).length;
  return (
    <div className="modal-overlay" onClick={onCloseModal}>
      <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Achievements</h2>
          <div className="achievements-summary">
            {earnedCount} of {allAchievements.length} unlocked
          </div>
          <button className="close-btn" onClick={onCloseModal}>×</button>
        </div>
        <div className="achievements-grid">
          {allAchievements.map(ach => 
            <AchievementModalItem key={ach.achievement_id} achievement={ach} />
          )}
        </div>
      </div>
    </div>
  );
};

const EditProfileModal = ({ 
  temporaryProfileData, 
  fileInputReference, 
  onCloseModal, 
  onInputChange, 
  onSaveProfile, 
  onCancelEdit, 
  onChangeProfileImageClick, 
  onProfileImageFileChange,
  editValidationError
}) => (
  <div className="modal-overlay" onClick={onCloseModal}>
    <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Edit Profile</h2>
        <button className="close-btn" onClick={onCloseModal}>×</button>
      </div>
      <div className="edit-form">
        <div className="profile-image-edit-section">
          <div className="profile-image-container-edit">
            {temporaryProfileData.profile_picture ? 
              <img src={temporaryProfileData.profile_picture} alt={temporaryProfileData.name} className="profile-image-edit" /> : 
              <div className="profile-emoji-default">🌸</div>
            }
          </div>
          <button className="change-image-btn-edit" onClick={onChangeProfileImageClick} type="button">
            Change Photo
          </button>
          <input 
            type="file" 
            ref={fileInputReference} 
            onChange={onProfileImageFileChange} 
            accept=".png,.jpeg,.jpg" 
            style={{ display: "none" }} 
          />
        </div>
        <div className="form-fields">
          <div className="form-field-wrapper">
            <label className="form-field-label">
              Name
              <span className="required-asterisk">*</span>
            </label>
            <input 
              type="text" 
              name="name" 
              value={temporaryProfileData.name || ""} 
              onChange={onInputChange} 
              className={`input-field-edit ${editValidationError ? 'input-field-error' : ''}`}
              placeholder="Enter your name" 
            />
            {editValidationError && (
              <div className="error-text-field">{editValidationError}</div>
            )}
          </div>
          <div className="form-field-wrapper">
            <label className="form-field-label">Bio</label>
            <textarea 
              name="bio" 
              value={temporaryProfileData.bio || ""} 
              onChange={onInputChange} 
              rows="4" 
              className="input-field-edit bio-textarea" 
              placeholder="Tell us about yourself" 
            />
          </div>
          <div className="edit-buttons">
            <button className="btn save-btn" onClick={onSaveProfile} type="button">Save</button>
            <button className="btn cancel-btn" onClick={onCancelEdit} type="button">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Share Card Components
const AchievementShareCard = ({ earnedCount, totalCount, latestAchievement }) => {
  if (!latestAchievement) {
    return (
      <>
        <div className="achievement-header">ACHIEVEMENTS</div>
        <div className="share-icon-large">🏆</div>
        <div className="label-display">{earnedCount}/{totalCount}</div>
        <div className="label-2-display">Achievements Unlocked</div>
        <div className="share-detail-text">Keep going to earn more achievements!</div>
      </>
    );
  }

  const formatEarnedDate = (dateString) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString('en-GB', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const descriptionText = latestAchievement.description 
    ? latestAchievement.description.replace(/\s+/g, ' ').trim()
    : '';

  return (
    <>
      <div className="achievement-emoji-container">
        <div className="achievement-emoji">
          {latestAchievement.icon}
        </div>
      </div>
      
      <div className="achievement-content-container">
        <div className="achievement-header">YOU'VE GOT AN ACHIEVEMENT</div>
        
        <div className="achievement-title-wrapper">
          <h3 className="share-achievement-title">
            {latestAchievement.title}
          </h3>
        </div>
        
        <div className="achievement-description-wrapper">
          <p className="share-achievement-description">
            {descriptionText}
          </p>
        </div>
        
        <div className="achievement-congrats">CONGRATULATION</div>
        
        <div className="share-achievement-date">
          {formatEarnedDate(latestAchievement.earned_date)}
        </div>
      </div>
    </>
  );
};

const MoodShareCard = ({ moodData, weekLabel, moodScore }) => {
  const moodColors = getMoodColors(moodScore);
  
  const getMoodText = (description) => {
    if (description.includes("Tough")) return "Tough";
    if (description.includes("Okay")) return "Okay";
    if (description.includes("Good")) return "Good";
    if (description.includes("Great")) return "Great";
    if (description.includes("Amazing")) return "Amazing";
    return description.split(" ")[0];
  };

  const moodText = getMoodText(moodData?.moodDescription || "Not tracked");

  return (
    <>
      {moodData?.moodImage ? (
        <img 
          src={moodData.moodImage} 
          alt={moodData.moodDescription} 
          className="mood-share-image"
        />
      ) : (
        <div className="share-icon-large mood-emoji">
          {moodData?.moodEmoji || "🤔"}
        </div>
      )}
      <div className="mood-share-header">YOUR MOOD THIS WEEK</div>
      <div className="mood-share-text">{moodText}</div>
    </>
  );
};

// FIXED: NewHabitStatShareCard component
const NewHabitStatShareCard = ({ habits = [], weeklyNewHabit = null }) => {
  // Priority: use backend data if available, fallback to habits array
  let habitToDisplay = weeklyNewHabit;
  
  if (!habitToDisplay && habits.length > 0) {
    // Fallback: find most recent habit from habits array
    habitToDisplay = getMostRecentHabit(habits);
  }

  if (!habitToDisplay) {
    return (
      <>
        <div className="new-habit-emoji-container">
          <div className="new-habit-emoji">📚</div>
        </div>
        
        <div className="new-habit-content-container">
          <div className="new-habit-header">THIS WEEK</div>
          <div className="new-habit-subtitle">NEW HABIT</div>
          
          <div className="new-habit-percentage-wrapper">
            <span className="new-habit-percentage">0</span>
            <span className="new-habit-percent-symbol">%</span>
          </div>
          
          <div className="new-habit-name">"No habits yet"</div>
        </div>
      </>
    );
  }

  const completionRate = calculateWeeklyCompletionRate(habitToDisplay);
  const habitEmoji = habitToDisplay.emoji || habitToDisplay.icon || "📚";
  const habitName = habitToDisplay.habit_name || habitToDisplay.name || "New Habit";

  return (
    <>
      <div className="new-habit-emoji-container">
        <div className="new-habit-emoji">
          {habitEmoji}
        </div>
      </div>
      
      <div className="new-habit-content-container">
        <div className="new-habit-header">THIS WEEK</div>
        <div className="new-habit-subtitle">NEW HABIT</div>
        
        <div className="new-habit-percentage-wrapper">
          <span className="new-habit-percentage">{completionRate}</span>
          <span className="new-habit-percent-symbol">%</span>
        </div>
        
        <div className="new-habit-name">"{habitName}"</div>
      </div>
    </>
  );
};

const WeeklyProgressComparisonCard = ({ progressData }) => {
  const percentageChange = progressData?.percentageChange || 0;
  const isPositive = percentageChange >= 0;
  
  return (
    <div className="progress-full-image-container">
      <img 
        src={barCard} 
        alt="Weekly progress visualization" 
        className="progress-full-image"
      />
      <div className="progress-content-overlay">
        <div className="progress-completion-text">You've completed</div>
        <div className="progress-percentage-container">
          <span className="share-progress-number">{Math.abs(percentageChange)}</span>
          <span className="progress-percent-symbol">%</span>
        </div>        
        <div className="progress-comparison-text">
          {isPositive ? 'More than last week' : 'Less than last week'}
        </div>
      </div>
    </div>
  );
};

// FIXED: HighestProgressHabitShareCard component
const HighestProgressHabitShareCard = ({ highestProgressHabit = {}, allHabits = [] }) => {
  // Use data directly from backend response if available, otherwise calculate from habits
  let habitToDisplay = highestProgressHabit;
  
  if ((!habitToDisplay || !habitToDisplay.habit_name) && allHabits.length > 0) {
    habitToDisplay = calculateHighestProgressHabit(allHabits);
  }

  if (!habitToDisplay) {
    return (
      <>
        <div className="best-task-badge-container">
          <div className="best-task-badge-circle">
            <div className="best-task-icon">📚</div>
          </div>
          <div className="best-task-ribbon-left"></div>
          <div className="best-task-ribbon-right"></div>
        </div>
        
        <div className="best-task-content">
          <div className="best-task-header">Weekly Best Habit</div>
          
          <div className="best-task-percentage">
            0<span className="best-task-percent-symbol">%</span>
          </div>
          
          <div className="best-task-name">"No habits"</div>
          <div className="best-task-status">COMPLETED</div>
        </div>
      </>
    );
  }

  const habitEmoji = habitToDisplay.emoji || habitToDisplay.icon || "📚";
  const habitName = habitToDisplay.habit_name || habitToDisplay.name || "Best Habit";
  const progressPercentage = habitToDisplay.progressPercentage || calculateWeeklyCompletionRate(habitToDisplay);

  return (
    <>
      <div className="best-task-badge-container">
        <div className="best-task-badge-circle">
          <div className="best-task-icon">{habitEmoji}</div>
        </div>
        <div className="best-task-ribbon-left"></div>
        <div className="best-task-ribbon-right"></div>
      </div>
      
      <div className="best-task-content">
        <div className="best-task-header">Weekly Best Habit</div>
        
        <div className="best-task-percentage">
          {Math.round(progressPercentage)}<span className="best-task-percent-symbol">%</span>
        </div>
        
        <div className="best-task-name">"{habitName}"</div>
        <div className="best-task-status">COMPLETED</div>
      </div>
    </>
  );
};

const OverallStreakShareCard = ({ overallStreak }) => (
  <>
    <div className="streak-flame-container">
      <div className="streak-flame-icon">🔥</div>
      <div className="streak-number-overlay">
        {overallStreak?.longestOverallStreak || 0}
      </div>
    </div>
    
    <div className="streak-label-section">
      <div className="streak-main-label">Your weekly streak</div>
    </div>
  </>
);

const ShareModalContainer = ({ 
  userProfile, 
  currentCardIndex, 
  shareCards, 
  onClose, 
  goToNextCard, 
  goToPreviousCard 
}) => {
  const cardRef = useRef(null);
  const currentCard = shareCards[currentCardIndex];

  const handleVisualShare = async () => {
    const cardToCapture = cardRef.current;
    if (!cardToCapture) return;

    const elementsToHide = [
      '.share-card-decorator',
      '.share-card-footer-action',
      '.share-action-btn-visual'
    ].map(selector => cardToCapture.querySelector(selector));

    elementsToHide.forEach(el => {
      if (el) el.style.display = 'none';
    });

    cardToCapture.style.boxShadow = 'none';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.padding = '100px';
    wrapper.style.background = 'transparent';
    
    const cardClone = cardToCapture.cloneNode(true);
    cardClone.style.position = 'relative';
    cardClone.style.margin = '0';
    
    wrapper.appendChild(cardClone);
    document.body.appendChild(wrapper);
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';

    try {
      const canvas = await html2canvas(wrapper, {
        useCORS: true,
        backgroundColor: null,
        scale: 3,
        logging: false,
        allowTaint: true,
        removeContainer: true,
        imageTimeout: 0,
      });

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `bloomup-${currentCard.type}-${new Date().getTime()}.png`;
        link.href = url;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        alert('Image saved successfully!');
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('Saving image failed:', error);
      alert('Oops! Something went wrong while saving the image.');
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
      
      elementsToHide.forEach(el => {
        if (el) el.style.display = '';
      });
      cardToCapture.style.boxShadow = '';
    }
  };

  useEffect(() => {
    const handleCardShare = () => {
      handleVisualShare();
    };

    document.addEventListener('triggerShare', handleCardShare);

    return () => {
      document.removeEventListener('triggerShare', handleCardShare);
    };
  }, [currentCardIndex]);

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal-close-btn" onClick={onClose}>×</button>
        <div className="card-and-external-nav-wrapper">
          <button 
            className="nav-arrow-btn external-nav-left" 
            onClick={goToPreviousCard} 
            disabled={currentCardIndex === 0}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <div 
            ref={cardRef} 
            className={`share-card-container ${currentCard.theme || 'default-theme'}`}
            style={currentCard.customStyle || {}}
          >
            <div className="share-card-fg">
              {currentCard.content}
            </div>
            <div className="share-card-footer-action">
              <button className="share-action-btn-visual" onClick={handleVisualShare}>
                <span className="material-symbols-outlined">ios_share</span>
                Share
              </button>
            </div>
          </div>

          <button 
            className="nav-arrow-btn external-nav-right" 
            onClick={goToNextCard} 
            disabled={currentCardIndex === shareCards.length - 1}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <PageIndicator
          count={shareCards.length}
          activeIndex={currentCardIndex}
        />
      </div>
    </div>
  );
};

// Main Component
export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [temporaryProfileData, setTemporaryProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editValidationError, setEditValidationError] = useState(""); // Validation State
  

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [allAchievementsList, setAllAchievementsList] = useState([]);
  const [earnedAchievementsList, setEarnedAchievementsList] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentShareCardIndex, setCurrentShareCardIndex] = useState(0);
  
  const [reportStats, setReportStats] = useState(null);
  const [moodSummary, setMoodSummary] = useState(null);
  const [allHabits, setAllHabits] = useState([]);
  const fileInputReference = useRef(null);

  useEffect(() => {
    document.body.classList.add('profile-page-active');
    return () => document.body.classList.remove('profile-page-active');
  }, []);

  useEffect(() => {
    loadUserProfileData();
  }, []);
 
 // --- Generate Dynamic Activity ---
  useEffect(() => {
    if (!reportStats || !earnedAchievementsList) return;

    const activities = [];

    // 1. Recent Achievements (Top 2)
    const latestAchievements = [...earnedAchievementsList].reverse().slice(0, 2);
    latestAchievements.forEach(ach => {
      activities.push({
        icon: "🏆",
        text: `Unlocked: ${ach.title}`,
        time: ach.earned_date ? new Date(ach.earned_date).toLocaleDateString('en-GB') : "Recently"
      });
    });

    // 2. Streak
    if (reportStats.longestOverallStreak > 0) {
      activities.push({
        icon: "🔥",
        text: `Maintained a ${reportStats.longestOverallStreak} day streak!`,
        time: "Ongoing"
      });
    }

    // 3. Mood
    if (moodSummary && moodSummary.logs_count > 0) {
      activities.push({
        icon: "📝",
        text: `Tracked mood ${moodSummary.logs_count} times this week`,
        time: "This week"
      });
    }

    // 4. Habits activity
    if (allHabits.length > 0) {
      const recentHabit = getMostRecentHabit(allHabits);
      if (recentHabit) {
        activities.push({
          icon: recentHabit.emoji || "📚",
          text: `Created habit: ${recentHabit.habit_name || recentHabit.name}`,
          time: "Recently"
        });
      }
    }

    // 5. Fallback
    if (activities.length === 0) {
      activities.push({
        icon: "👋",
        text: "Joined BloomUp!",
        time: formatMemberSinceDate()
      });
    }

    setRecentActivities(activities);
  }, [reportStats, earnedAchievementsList, moodSummary, allHabits]); // Re-run when these change

  // FIXED: Added habits data fetching
  const loadUserProfileData = async () => {
    setIsLoading(true);
    try {
      const profile = await getMyProfile();
      setUserProfile(profile);
      setTemporaryProfileData(profile);
      
      // Fetch habits data
      const habitStorage = createStorage();
      const habits = await habitStorage.list();
      setAllHabits(habits);
      
      const [allAch, earnedAch, shareableData, weeklyMood] = await Promise.all([
        getUserAchievements(),
        getEarnedAchievements(),
        getShareableStats(),
        getWeeklyMoodSummary()
      ]);

      setAllAchievementsList(allAch);
      setEarnedAchievementsList(earnedAch);
      setReportStats(shareableData);
      setMoodSummary(weeklyMood);

      // Debug logging
      console.log('Loaded habits:', habits);
      console.log('Shareable stats:', shareableData);

    } catch (error) {
      console.error("Failed to load profile data:", error);
      setErrorMessage(error.message || "Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

const handleInputChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "name") setEditValidationError(""); // Clear error on type

    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setTemporaryProfileData({ ...temporaryProfileData, profile_picture: e.target.result });
      reader.readAsDataURL(files[0]);
    } else {
      setTemporaryProfileData({ 
        ...temporaryProfileData, 
        [name]: value 
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!temporaryProfileData.name || temporaryProfileData.name.trim() === "") {
      setEditValidationError("Name is required.");
      return;
    }
    try {
      if (temporaryProfileData.profile_picture && temporaryProfileData.profile_picture.startsWith('data:')) {
        const res = await fetch(temporaryProfileData.profile_picture);
        const blob = await res.blob();
        const file = new File([blob], "avatar.jpg", { type: blob.type });
        await uploadAvatar(file);
      }
      
      const updatedProfile = await updateProfile({ 
        name: temporaryProfileData.name, 
        bio: temporaryProfileData.bio 
      });
      
      setUserProfile(updatedProfile);
      setTemporaryProfileData(updatedProfile);
      setIsEditingProfile(false);
      setEditValidationError("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save profile.");
    }
  };

  const handleCancelEdit = () => {
    setTemporaryProfileData(userProfile);
    setEditValidationError("");
    setIsEditingProfile(false);
  };

  const formatMemberSinceDate = () => {
    if (!userProfile?.created_at) return "—";
    return new Date(userProfile.created_at).toLocaleDateString("en-US", { 
      month: "long", 
      year: "numeric" 
    });
  };

  const generateShareCardsConfig = () => {
    const cardsConfig = [];

    const hasEarnedAchievements = earnedAchievementsList.length > 0;
    const latestAchievement = hasEarnedAchievements 
      ? earnedAchievementsList[earnedAchievementsList.length - 1] 
      : null;

    if (hasEarnedAchievements) {
      cardsConfig.push({
        type: "achievement",
        content: (
          <AchievementShareCard
            earnedCount={earnedAchievementsList.length}
            totalCount={allAchievementsList.length}
            latestAchievement={latestAchievement}
          />
        ),
        theme: 'theme-achievement',
      });
    }

    if (moodSummary?.hasHistory && isMoodCardVisible()) {
    const mood = scoreToMoodDisplay(moodSummary.most_common_mood);
    const moodColors = getMoodColors(moodSummary.most_common_mood);
    
    cardsConfig.push({
      type: "mood",
      content: (
        <MoodShareCard
          moodData={{
            moodImage: mood.image,
            moodEmoji: mood.emoji,
            moodDescription: mood.description,
          }}
          weekLabel={moodSummary.weekLabel || "Previous Week"}
          moodScore={moodSummary.most_common_mood}
        />
      ),
      theme: 'theme-mood-custom',
      customStyle: {
        background: moodColors.background,
        color: moodColors.text
      }
    });
  }


    // Only show habit-related cards if we have habits
    if (allHabits.length > 0) {
      cardsConfig.push(
        {
          type: "new_habit_stat",
          content: (
            <NewHabitStatShareCard 
              habits={allHabits}
              weeklyNewHabit={reportStats?.weeklyNewHabit}
            />
          ),
          theme: 'theme-new-habit',
        },
        {
          type: "highest_progress_habit",
          content: (
            <HighestProgressHabitShareCard
              highestProgressHabit={reportStats?.highestProgressHabit || {}}
              allHabits={allHabits}
            />
          ),
          theme: 'theme-progress',
        }
      );
    }

    cardsConfig.push(
      {
        type: "weekly_progress_comparison",
        content: (
          <WeeklyProgressComparisonCard
            progressData={{
              lastWeekProgress: reportStats?.lastWeekProgress || 0,
              thisWeekProgress: reportStats?.thisWeekProgress || 0,
              percentageChange: reportStats?.percentageChange || 0
            }}
          />
        ),
        theme: 'theme-review',
      },
      {
        type: "overall_streak",
        content: <OverallStreakShareCard
          overallStreak={{
            longestOverallStreak: reportStats?.longestOverallStreak || 0
          }}
        />,
        theme: 'theme-streak',
      }
    );

    return cardsConfig;
  };

  const goToNextShareCard = () => {
    const shareCardsConfig = generateShareCardsConfig();
    setCurrentShareCardIndex(prevIndex => 
      (prevIndex + 1) % shareCardsConfig.length
    );
  };

  const goToPreviousShareCard = () => {
    const shareCardsConfig = generateShareCardsConfig();
    setCurrentShareCardIndex(prevIndex => 
      (prevIndex - 1 + shareCardsConfig.length) % shareCardsConfig.length
    );
  };

  if (isLoading || !reportStats || !moodSummary) {
    return <p className="loading">Loading...</p>;
  }

  if (!userProfile) {
    return <div className="error-message">{errorMessage || "Failed to load profile"}</div>;
  }

  const shareCardsConfig = generateShareCardsConfig();
  const displayStats = {
    activeHabits: reportStats.activeHabits || allHabits.filter(h => h.is_active !== false).length,
    longestStreak: reportStats.longestOverallStreak,
    gratitudeEntries: reportStats.gratitudeEntries,
    daysTracked: reportStats.daysTracked,
  };

  return (
    <div className="profile-page">
      <ProfileHeader
        profileData={userProfile}
        onEditProfileClick={() => setIsEditingProfile(true)}
        onShareClick={() => setShowShareModal(true)}
        formatMemberSinceDate={formatMemberSinceDate}
      />

      <StatsSection userStats={displayStats} />
      
      <div className="content-grid">
        <AchievementsCard
          userAchievements={earnedAchievementsList}
          earnedAchievementsCount={earnedAchievementsList.length}
          totalAchievementsCount={allAchievementsList.length}
          onViewAllAchievements={() => setShowAchievementsModal(true)}
        />
        <RecentActivityCard activities={recentActivities} />
      </div>

      {showAchievementsModal && (
        <AchievementsModal 
          allAchievements={allAchievementsList} 
          onCloseModal={() => setShowAchievementsModal(false)} 
        />
      )}
      
      {isEditingProfile && (
        <EditProfileModal 
          temporaryProfileData={temporaryProfileData}
          fileInputReference={fileInputReference}
          onCloseModal={() => setIsEditingProfile(false)}
          onInputChange={handleInputChange}
          onSaveProfile={handleSaveProfile}
          onCancelEdit={handleCancelEdit}
          onChangeProfileImageClick={() => fileInputReference.current.click()}
          onProfileImageFileChange={handleInputChange}
          editValidationError={editValidationError}
        />
      )}

      {showShareModal && (
        <ShareModalContainer
          userProfile={userProfile}
          shareCards={shareCardsConfig}
          currentCardIndex={currentShareCardIndex}
          onClose={() => setShowShareModal(false)}
          goToNextCard={goToNextShareCard}
          goToPreviousCard={goToPreviousShareCard}
        />
      )}
      
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
}