import React, { useState, useEffect, useRef } from "react";
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


// --- Gratitude Share Modal Component ---
const GratitudeShareModal = ({ gratitudeEntry, onClose }) => {
  const handleActualShare = () => {
    alert(`Sharing this gratitude: "${gratitudeEntry.text}"`);
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* This is the visual card that gets shared */}
        <div className="gratitude-card-shareable">
          <div className="gratitude-card-header">
            ✨ A Moment of Gratitude ✨
          </div>
          <div className="gratitude-card-body">
            <p>"{gratitudeEntry.text}"</p>
          </div>
          <div className="gratitude-card-footer">
            Shared from 🌸 BloomUp
          </div>
        </div>
        {/* Action buttons for the modal */}
        <div className="share-modal-actions">
          <button className="btn share-action-btn" onClick={handleActualShare}>Share Now</button>
          <button className="btn cancel-action-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const ProfileHeader = ({ profileData, onEditProfileClick, onShareClick, formatMemberSinceDate }) => (
  <div className="profile-card profile-header-card">
    <div className="profile-header-content">
      <div className="profile-image-section">
        <div className="profile-image-container">
          {profileData.profile_picture ? (
            <img
              src={profileData.profile_picture}
              alt={profileData.name}
              className="profile-image"
            />
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
          <div className="profile-tag-item">
            <span className="tag-emoji">🌱</span> Wellness Explorer
          </div>
          <div className="member-since-text">
            Member since {formatMemberSinceDate()}
          </div>
        </div>
      </div>
    </div>
  </div>
);

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
          {userAchievements.slice(0, 3).map(achievement => (
            <AchievementItem key={achievement.achievement_id} achievement={achievement} />
          ))}
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
      {RECENT_ACTIVITIES_DATA.map((activityItem, index) => (
        <ActivityItem key={index} activityItem={activityItem} />
      ))}
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
    const earnedAchievementsCount = allAchievements.filter(ach => ach.is_earned).length;
    return (
        <div className="modal-overlay" onClick={onCloseModal}>
            <div className="profile-modal-content achievements-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Achievements</h2>
                    <div className="achievements-summary">{earnedAchievementsCount} of {allAchievements.length} unlocked</div>
                    <button className="close-btn" onClick={onCloseModal}>×</button>
                </div>
                <div className="achievements-grid">
                    {allAchievements.map((achievement) => (
                        <AchievementModalItem key={achievement.achievement_id} achievement={achievement} />
                    ))}
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
      {achievement.is_earned && achievement.earned_date && (
        <div className="achievement-date">Earned {new Date(achievement.earned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
      )}
      {!achievement.is_earned && (
        <div className="achievement-requirement">Progress: {achievement.progress_unit_value} ({achievement.progress}%)</div>
      )}
    </div>
  </div>
);

const EditProfileModal = ({ temporaryProfileData, fileInputReference, onCloseModal, onInputChange, onSaveProfile, onCancelEdit, onChangeProfileImageClick, onProfileImageFileChange }) => (
    <div className="modal-overlay" onClick={onCloseModal}>
        <div className="profile-modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Edit Profile</h2>
                <button className="close-btn" onClick={onCloseModal}>×</button>
            </div>
            <div className="edit-form">
                <div className="profile-image-edit-section">
                    <div className="profile-image-container-edit">
                        {temporaryProfileData.profile_picture ? (
                            <img src={temporaryProfileData.profile_picture} alt={temporaryProfileData.name} className="profile-image-edit" />
                        ) : (
                            <div className="profile-emoji-default">🌸</div>
                        )}
                    </div>
                    <button className="change-image-btn-edit" onClick={onChangeProfileImageClick} type="button">Change Photo</button>
                    <input type="file" ref={fileInputReference} onChange={onProfileImageFileChange} accept=".png,.jpeg,.jpg,image/png,image/jpeg" style={{ display: "none" }} />
                </div>
                <div className="form-fields">
                    <input type="text" name="name" value={temporaryProfileData.name || ""} onChange={onInputChange} className="input-field-edit" placeholder="Name" />
                    <textarea name="bio" value={temporaryProfileData.bio || ""} onChange={onInputChange} rows="4" className="input-field-edit bio-textarea" placeholder="Bio" />
                    <div className="edit-buttons">
                        <button className="btn save-btn" onClick={onSaveProfile} type="button">Save Changes</button>
                        <button className="btn cancel-btn" onClick={onCancelEdit} type="button">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Main Component
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
  const [showGratitudeShareModal, setShowGratitudeShareModal] = useState(false);
  const fileInputReference = useRef(null);

  useEffect(() => {
    document.body.classList.add('profile-page-active');
    return () => {
      document.body.classList.remove('profile-page-active');
    };
  }, []);

  useEffect(() => {
    loadUserProfileData();
  }, []);

  const loadUserProfileData = async () => {
    try {
      setIsLoading(true);
      const fetchedUserProfile = await getMyProfile();
      setUserProfile(fetchedUserProfile);
      setTemporaryProfileData(fetchedUserProfile);

      const fetchedUserStats = await getProfileStats();
      setUserStatistics(fetchedUserStats);

      const fetchedAllAchievements = await getUserAchievements();
      setAllAchievementsList(fetchedAllAchievements);

      const fetchedEarnedAchievements = await getEarnedAchievements();
      setEarnedAchievementsList(fetchedEarnedAchievements);
    } catch (error) {
      console.error("Failed to load profile data:", error);
      setErrorMessage(`Failed to load profile: ${error.message}`);
      // Set default stats on failure
      setUserStatistics({ activeHabits: 0, gratitudeEntries: 0, longestStreak: 0, daysTracked: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        setErrorMessage("Please upload only PNG or JPEG files");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setTemporaryProfileData({ ...temporaryProfileData, profile_picture: reader.result });
      reader.readAsDataURL(file);
    } else {
      setTemporaryProfileData({ ...temporaryProfileData, [name]: value });
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (temporaryProfileData.profile_picture && temporaryProfileData.profile_picture.startsWith('data:')) {
        const response = await fetch(temporaryProfileData.profile_picture);
        const blob = await response.blob();
        const imageFile = new File([blob], 'avatar.jpg', { type: blob.type });
        await uploadAvatar(imageFile);
      }
      const updatedProfile = await updateProfile({ name: temporaryProfileData.name, bio: temporaryProfileData.bio });
      setUserProfile(updatedProfile);
      setTemporaryProfileData(updatedProfile);
      setIsEditingProfile(false);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save profile");
    }
  };

  const formatMemberSinceDate = () => {
    if (!userProfile?.created_at) return "—";
    return new Date(userProfile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (isLoading) return <p className="loading">Loading...</p>;
  if (!userProfile) return <p className="loading">Failed to load profile</p>;

  const sampleGratitudeEntry = { text: "The feeling of a warm cup of coffee on a chilly morning." };

  return (
    <div className="profile-page">
      <ProfileHeader
        profileData={userProfile}
        onEditProfileClick={() => setIsEditingProfile(true)}
        onShareClick={() => setShowGratitudeShareModal(true)}
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
      {isEditingProfile && <EditProfileModal temporaryProfileData={temporaryProfileData} fileInputReference={fileInputReference} onCloseModal={() => setIsEditingProfile(false)} onInputChange={handleInputChange} onSaveProfile={handleSaveProfile} onCancelEdit={() => setIsEditingProfile(false)} onChangeProfileImageClick={() => fileInputReference.current.click()} onProfileImageFileChange={handleInputChange} />}
      {showGratitudeShareModal && <GratitudeShareModal gratitudeEntry={sampleGratitudeEntry} onClose={() => setShowGratitudeShareModal(false)} />}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
}