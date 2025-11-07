import React, { useState, useEffect, useRef } from "react";
import html2canvas from 'html2canvas';
import { getMyProfile, updateProfile, uploadAvatar } from "../services/userService";
import { getProfileStats } from "../services/statsService";
import { getUserAchievements, getEarnedAchievements } from "../services/achievementService";
import "./style/Profile.css";

// Constants
const STATS_CONFIGURATION = [
  { key: "activeHabits", icon: "ads_click", label: "ACTIVE HABITS" },
  { key: "longestStreak", icon: "local_fire_department", label: "LONGEST STREAK" },
  { key: "gratitudeEntries", icon: "favorite_border", label: "GRATITUDE ENTRIES" },
  { key: "daysTracked", icon: "calendar_month", label: "DAYS TRACKED" }
];

const RECENT_ACTIVITIES_DATA = [
  { icon: "✅", text: "Completed Morning Meditation", time: "2 hours ago" },
  { icon: "📝", text: "Logged Daily Gratitude", time: "5 hours ago" },
  { icon: "💧", text: "Drank 8 glasses of water", time: "Yesterday" },
  { icon: "🏃‍♂️", text: "Completed evening run", time: "Yesterday" }
];

const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
};

// =================================================================
// CROWN ICON COMPONENT - Reused for Share Modals
// =================================================================
const CrownIcon = ({ bgColorClass, isActive }) => (
  <div className={`crown-icon ${bgColorClass} ${isActive ? 'active' : ''}`}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 14L3 6L8 9L12 4L16 9L21 6L20 14H4Z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14V20H20V14" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {isActive && <circle cx="12" cy="11.5" r="2" fill="#34D399" />}
    </svg>
  </div>
);


// =================================================================
// NEW: PAGE INDICATOR COMPONENT
// =================================================================
const PageIndicator = ({ count, activeIndex }) => (
    <div className="page-indicator">
      {/* Create an array from the count and map over it to render dots */}
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className={`dot ${index === activeIndex ? 'active' : ''}`}
        />
      ))}
    </div>
  );

// =================================================================
// START: SHARE MODAL CONTAINER - NOW WITH PAGE INDICATOR
// =================================================================
const ShareModalContainer = ({ userProfile, currentCardIndex, shareCards, onClose, goToNextCard, goToPreviousCard }) => {
  const cardRef = useRef(null);
  const currentCard = shareCards[currentCardIndex];

  const handleVisualShare = async () => {
    if (!cardRef.current) return;
    try {
      cardRef.current.style.boxShadow = 'none';

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
      });

      cardRef.current.style.boxShadow = '';

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const file = new File([blob], 'bloomup-share.png', { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My BloomUp Moment',
          text: `Check out my ${currentCard.type} progress with BloomUp!`,
          files: [file],
        });
      } else {
        alert("Your browser doesn't support sharing images.");
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      if (error.name !== 'AbortError') {
        alert('Oops! Something went wrong while trying to share.');
      }
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="share-modal-close-btn" onClick={onClose}>×</button>
        <div className="card-and-external-nav-wrapper">
          <button className="nav-arrow-btn external-nav-left" onClick={goToPreviousCard} disabled={currentCardIndex === 0}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <div className="share-card-container" ref={cardRef}>
            <div className="share-card-fg">
              <span className="card-type-indicator-internal">{currentCard.label}</span>
              {currentCard.content}
            </div>
            <div className="share-card-footer-action">
              <button className="share-action-btn-visual" onClick={handleVisualShare}>
                <span className="material-symbols-outlined">ios_share</span>
                Share
              </button>
            </div>
          </div>

          <button className="nav-arrow-btn external-nav-right" onClick={goToNextCard} disabled={currentCardIndex === shareCards.length - 1}>
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
// =================================================================
// END: SHARE MODAL CONTAINER
// =================================================================

// =================================================================
// START: INDIVIDUAL SHARE CARD COMPONENTS
// =================================================================

const GratitudeShareCard = ({ gratitudeCount }) => (
  <>
    <div className="crown-progress-bar">
      <CrownIcon bgColorClass="c-blue" isActive={gratitudeCount >= 1} />
      <CrownIcon bgColorClass="c-purple" isActive={gratitudeCount >= 5} />
      <CrownIcon bgColorClass="c-grey" isActive={gratitudeCount >= 10} />
    </div>
    <div className="label-display">{gratitudeCount}</div>
    <div className="label-2-display">Gratitude Entries Logged</div>
  </>
);

const AchievementShareCard = ({ earnedCount, totalCount, latestAchievement }) => (
  <>
    <div className="share-icon-large">🏆</div>
    <div className="label-display">{earnedCount}/{totalCount}</div>
    <div className="label-2-display">Achievements Unlocked</div>
    {latestAchievement && (
      <div className="share-detail-text">
        Latest: "{latestAchievement.title}" {latestAchievement.icon}
      </div>
    )}
  </>
);

const MoodShareCard = ({ moodData }) => (
  <>
    <div className="share-icon-large"></div>
    <div className="label-display">{moodData?.averageMood || "N/A"}</div>
    <div className="label-2-display">Average Mood This Week</div>
    <div className="share-detail-text">Feeling: {moodData?.moodDescription || "Good!"}</div>
  </>
);

const HabitShareCard = ({ habitData }) => (
  <>
    <div className="share-icon-large">🌿</div>
    <div className="label-display">{habitData?.completedCount || 0}</div>
    <div className="label-2-display">{habitData?.habitName || "Habits"} Completed</div>
    <div className="share-detail-text">Streak: {habitData?.currentStreak || 0} days 🔥</div>
  </>
);

const WeeklyReviewShareCard = ({ reviewData }) => (
  <>
    <div className="share-icon-large">📅</div>
    <div className="label-display">{reviewData?.habitsCompleted || 0}</div>
    <div className="=label-2-display">Habits Completed This Week</div>
    <div className="share-detail-text">Overall progress: {reviewData?.progressPercentage || 0}%</div>
  </>
);

const NewHabitStatShareCard = ({ newHabitStat }) => (
  <>
    <div className="share-icon-large">🚀</div>
    <div className="label-display">{newHabitStat?.newHabitCount || 0}</div>
    <div className="label-2-display">New Habits Started</div>
    <div className="share-detail-text">Excited to grow!</div>
  </>
);

const HighestProgressHabitShareCard = ({ highestProgressHabit }) => (
  <>
    <div className="share-icon-large">📈</div>
    <div className="label-display">{highestProgressHabit?.habitName || "Top Habit"}</div>
    <div className="label-2-display">Highest Progress ({highestProgressHabit?.progressPercentage || 0}%)</div>
    <div className="share-detail-text">Keep it up!</div>
  </>
);

const OverallStreakShareCard = ({ overallStreak }) => (
  <>
    <div className="share-icon-large">🔥</div>
    <div className="label-display">{overallStreak?.longestOverallStreak || 0}</div>
    <div className="label-2-display">Longest Overall Streak</div>
    <div className="share-detail-text">Across all habits!</div>
  </>
);
// =================================================================
// END: INDIVIDUAL SHARE CARD COMPONENTS
// =================================================================


// --- Original Profile Header Component (Unchanged) ---
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
          <div className="profile-tag-item"><span className="tag-emoji">🌱</span> Wellness Explorer</div>
          <div className="member-since-text">Member since {formatMemberSinceDate()}</div>
        </div>
      </div>
    </div>
  </div>
);

// --- Other Page Components ---
const StatsSection = ({ userStats }) => (
  <div className="profile-stats-cards-container">
    <div className="profile-stats-cards-grid">
      {STATS_CONFIGURATION.map(({ key, icon, label }) => (
        <div key={key} className="profile-stat-card">
          <div className="stat-icon"><span className="material-icons">{icon}</span></div>
          <div className="stat-number">{userStats[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const AchievementsCard = ({ userAchievements, earnedAchievementsCount, totalAchievementsCount, onViewAllAchievements }) => (
  <div className="profile-card achievements-card">
    <div className="card-header">
      <h2 className="card-title">Achievements</h2>
      <button className="view-all-btn" onClick={onViewAllAchievements}>{earnedAchievementsCount}/{totalAchievementsCount}</button>
    </div>
    <div className="achievements-content">
      <div className="achievement-progress">
        <div className="progress-number">{earnedAchievementsCount}/{totalAchievementsCount}</div>
        <div className="progress-label">Total Achievements</div>
      </div>
      <div className="achievements-list">
        {userAchievements.slice(0, 3).map(achievement => <AchievementItem key={achievement.achievement_id} achievement={achievement} />)}
      </div>
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

const RecentActivityCard = () => (
  <div className="profile-card activity-card">
    <div className="card-header"><h2 className="card-title">Recent Activity</h2></div>
    <div className="activity-list">
      {RECENT_ACTIVITIES_DATA.map((item, index) => <ActivityItem key={index} activityItem={item} />)}
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

const AchievementsModal = ({ allAchievements, onCloseModal }) => {
  const earnedCount = allAchievements.filter(a => a.is_earned).length;
  return (
    <div className="modal-overlay" onClick={onCloseModal}>
      <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Achievements</h2>
          <div className="achievements-summary">{earnedCount} of {allAchievements.length} unlocked</div>
          <button className="close-btn" onClick={onCloseModal}>×</button>
        </div>
        <div className="achievements-grid">
          {allAchievements.map(ach => <AchievementModalItem key={ach.achievement_id} achievement={ach} />)}
        </div>
      </div>
    </div>
  );
};

const AchievementModalItem = ({ achievement }) => (
  <div className={`achievement-card ${achievement.is_earned ? 'earned' : 'locked'}`}>
    <div className="achievement-icon-large">{achievement.is_earned ? achievement.icon : "🔒"}</div>
    <div className="achievement-content">
      <h3 className="achievement-title">{achievement.title}</h3>
      <p className="achievement-description">{achievement.description}</p>
      {achievement.is_earned && achievement.earned_date && <div className="achievement-date">Earned {new Date(achievement.earned_date).toLocaleDateString()}</div>}
      {!achievement.is_earned && <div className="achievement-requirement">Progress: {achievement.progress_unit_value} ({achievement.progress}%)</div>}
    </div>
  </div>
);

const EditProfileModal = ({ temporaryProfileData, fileInputReference, onCloseModal, onInputChange, onSaveProfile, onCancelEdit, onChangeProfileImageClick, onProfileImageFileChange }) => (
  <div className="modal-overlay" onClick={onCloseModal}>
    <div className="profile-modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Edit Profile</h2>
        <button className="close-btn" onClick={onCloseModal}>×</button>
      </div>
      <div className="edit-form">
        <div className="profile-image-edit-section">
          <div className="profile-image-container-edit">
            {temporaryProfileData.profile_picture ? <img src={temporaryProfileData.profile_picture} alt={temporaryProfileData.name} className="profile-image-edit" /> : <div className="profile-emoji-default">🌸</div>}
          </div>
          <button className="change-image-btn-edit" onClick={onChangeProfileImageClick} type="button">Change Photo</button>
          <input type="file" ref={fileInputReference} onChange={onProfileImageFileChange} accept=".png,.jpeg,.jpg" style={{ display: "none" }} />
        </div>
        <div className="form-fields">
          <input type="text" name="name" value={temporaryProfileData.name || ""} onChange={onInputChange} className="input-field-edit" placeholder="Name" />
          <textarea name="bio" value={temporaryProfileData.bio || ""} onChange={onInputChange} rows="4" className="input-field-edit bio-textarea" placeholder="Bio" />
          <div className="edit-buttons">
            <button className="btn save-btn" onClick={onSaveProfile} type="button">Save</button>
            <button className="btn cancel-btn" onClick={onCancelEdit} type="button">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);


// --- Main Page Component ---
export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const [temporaryProfileData, setTemporaryProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userStatistics, setUserStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allAchievementsList, setAllAchievementsList] = useState([]);
  const [earnedAchievementsList, setEarnedAchievementsList] = useState([]);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false); // Changed from showGratitudeShareModal
  const [currentShareCardIndex, setCurrentShareCardIndex] = useState(0); // New state for card index
  const fileInputReference = useRef(null);

  useEffect(() => {
    document.body.classList.add('profile-page-active');
    return () => document.body.classList.remove('profile-page-active');
  }, []);

  useEffect(() => {
    loadUserProfileData();
  }, []);

  const loadUserProfileData = async () => {
    setIsLoading(true);
    try {
      const profile = await getMyProfile();
      setUserProfile(profile);
      setTemporaryProfileData(profile);
      const stats = await getProfileStats();
      setUserStatistics(stats);
      const allAch = await getUserAchievements();
      setAllAchievementsList(allAch);
      const earnedAch = await getEarnedAchievements();
      setEarnedAchievementsList(earnedAch);
    } catch (error) {
      console.error("Failed to load profile data:", error);
      setErrorMessage(error.message || "Failed to load data.");
      setUserStatistics({ activeHabits: 0, longestStreak: 0, gratitudeEntries: 0, daysTracked: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => setTemporaryProfileData({ ...temporaryProfileData, profile_picture: e.target.result });
      reader.readAsURL(files[0]);
    } else {
      setTemporaryProfileData({ ...temporaryProfileData, [name]: value });
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (temporaryProfileData.profile_picture && temporaryProfileData.profile_picture.startsWith('data:')) {
        const res = await fetch(temporaryProfileData.profile_picture);
        const blob = await res.blob();
        const file = new File([blob], "avatar.jpg", { type: blob.type });
        await uploadAvatar(file);
      }
      const updatedProfile = await updateProfile({ name: temporaryProfileData.name, bio: temporaryProfileData.bio });
      setUserProfile(updatedProfile);
      setTemporaryProfileData(updatedProfile);
      setIsEditingProfile(false);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save profile.");
    }
  };

  const formatMemberSinceDate = () => {
    if (!userProfile?.created_at) return "—";
    return new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const goToNextShareCard = () => {
    setCurrentShareCardIndex(prevIndex => (prevIndex + 1) % shareCardsConfig.length);
  };

  const goToPreviousShareCard = () => {
    setCurrentShareCardIndex(prevIndex => (prevIndex - 1 + shareCardsConfig.length) % shareCardsConfig.length);
  };

  if (isLoading) return <p className="loading">Loading...</p>;
  if (!userProfile) return <div className="error-message">{errorMessage || "Failed to load profile"}</div>;

  // --- Dynamic Share Card Configuration ---
  const shareCardsConfig = [
    {
      type: "gratitude",
      label: "Gratitude Entries",
      content: <GratitudeShareCard gratitudeCount={userStatistics?.gratitudeEntries || 0} />,
    },
    {
      type: "achievement",
      label: "Achievements",
      content: <AchievementShareCard
        earnedCount={earnedAchievementsList.length}
        totalCount={allAchievementsList.length}
        latestAchievement={earnedAchievementsList.length > 0 ? earnedAchievementsList[earnedAchievementsList.length - 1] : null}
      />,
    },
    {
      type: "mood",
      label: "Weekly Mood",
      content: <MoodShareCard moodData={{ averageMood: "😄", moodDescription: "Joyful" }} />, // Placeholder data
    },
    {
      type: "habit",
      label: "Habit Progress",
      content: <HabitShareCard habitData={{ habitName: "Morning Routine", completedCount: 25, currentStreak: 7 }} />, // Placeholder data
    },
    {
      type: "new_habit_stat",
      label: "New Habits Started",
      content: <NewHabitStatShareCard newHabitStat={{ newHabitCount: 3 }} />, // Placeholder data
    },
    {
      type: "weekly_review",
      label: "Weekly Review",
      content: <WeeklyReviewShareCard reviewData={{ habitsCompleted: 15, progressPercentage: 80 }} />, // Placeholder data
    },
    {
      type: "highest_progress_habit",
      label: "Highest Progress Habit",
      content: <HighestProgressHabitShareCard highestProgressHabit={{ habitName: "Reading", progressPercentage: 92 }} />, // Placeholder data
    },
    {
      type: "overall_streak",
      label: "Overall Streak",
      content: <OverallStreakShareCard overallStreak={{ longestOverallStreak: 30 }} />, // Placeholder data
    },
  ];


  return (
    <div className="profile-page">
      <ProfileHeader
        profileData={userProfile}
        onEditProfileClick={() => setIsEditingProfile(true)}
        onShareClick={() => setShowShareModal(true)} // Changed to showShareModal
        formatMemberSinceDate={formatMemberSinceDate}
      />
      {userStatistics && (
        <>
          <StatsSection userStats={userStatistics} />
          <div className="content-grid">
            <AchievementsCard
              userAchievements={earnedAchievementsList}
              earnedAchievementsCount={earnedAchievementsList.length}
              totalAchievementsCount={allAchievementsList.length}
              onViewAllAchievements={() => setShowAchievementsModal(true)}
            />
            <RecentActivityCard />
          </div>
        </>
      )}
      {showAchievementsModal && <AchievementsModal allAchievements={allAchievementsList} onCloseModal={() => setShowAchievementsModal(false)} />}
      {isEditingProfile && <EditProfileModal temporaryProfileData={temporaryProfileData} fileInputReference={fileInputReference} onCloseModal={() => setIsEditingProfile(false)} onInputChange={handleInputChange} onSaveProfile={handleSaveProfile} onCancelEdit={() => setTemporaryProfileData(userProfile)} onChangeProfileImageClick={() => fileInputReference.current.click()} onProfileImageFileChange={handleInputChange} />}

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