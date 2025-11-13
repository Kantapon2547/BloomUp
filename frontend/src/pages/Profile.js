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

const ProfileHeader = ({ profileData, onEditProfileClick, onSettingsButtonClick, formatMemberSinceDate }) => (
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
          <button className="profile-logout-btn" onClick={handleLogout}>
            <span className="material-icons">logout</span> Logout
          </button>
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
          <div className="stat-icon">
            <span className="material-icons">{icon}</span>
          </div>
          <div className="stat-number">{userStats[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const AchievementsCard = ({ userAchievements, earnedAchievementsCount, totalAchievementsCount, onViewAllAchievements }) => {
  return (
    <div className="profile-card achievements-card">
      <div className="card-header">
        <h2 className="card-title">Achievements</h2>
        <button className="view-all-btn" onClick={onViewAllAchievements}>
          {earnedAchievementsCount}/{totalAchievementsCount}
        </button>
      </div>
      <div className="achievements-content">
        <div className="achievement-progress">
          <div className="progress-number">
            {earnedAchievementsCount}/{totalAchievementsCount}
          </div>
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
};

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
    <div className="card-header">
      <h2 className="card-title">Recent Activity</h2>
    </div>
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
  const earnedAchievementsCount = allAchievements.filter(achievement => achievement.is_earned).length;
  const totalAchievementsCount = allAchievements.length;

  return (
    <div className="modal-overlay" onClick={onCloseModal}>
      <div className="profile-modal-content achievements-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Achievements</h2>
          <div className="achievements-summary">
            {earnedAchievementsCount} of {totalAchievementsCount} unlocked
          </div>
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
    <div className="achievement-icon-large">
      {achievement.is_earned ? achievement.icon : "🔒"}
    </div>
    <div className="achievement-content">
      <h3 className="achievement-title">{achievement.title}</h3>
      <p className="achievement-description">{achievement.description}</p>
      {achievement.is_earned && achievement.earned_date && (
        <div className="achievement-date">
          Earned {new Date(achievement.earned_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>
      )}
      {!achievement.is_earned && (
        <div className="achievement-requirement">
          Progress: {achievement.progress_unit_value} ({achievement.progress}%)
        </div>
      )}
    </div>
  </div>
);

const EditProfileModal = ({ 
  temporaryProfileData, 
  fileInputReference, 
  onCloseModal, 
  onInputChange, 
  onSaveProfile, 
  onCancelEdit, 
  onChangeProfileImageClick, 
  onProfileImageFileChange 
}) => (
  <div className="modal-overlay" onClick={onCloseModal}>
    <div className="profile-modal-content edit-modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <h2>Edit Profile</h2>
        <button className="close-btn" onClick={onCloseModal}>×</button>
      </div>

      <div className="edit-form">
        <div className="profile-image-edit-section">
          <div className="profile-image-container-edit">
            {temporaryProfileData.profile_picture ? (
              <img
                src={temporaryProfileData.profile_picture}
                alt={temporaryProfileData.name}
                className="profile-image-edit"
              />
            ) : (
              <div className="profile-emoji-default">🌸</div>
            )}
          </div>
          <button className="change-image-btn-edit" onClick={onChangeProfileImageClick} type="button">
            Change Photo
          </button>
          <input
            type="file"
            ref={fileInputReference}
            onChange={onProfileImageFileChange}
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            style={{ display: "none" }}
          />
        </div>

        <div className="form-fields">
          <input
            type="text"
            name="name"
            value={temporaryProfileData.name || ""}
            onChange={onInputChange}
            className="input-field-edit"
            placeholder="Name"
          />
          <textarea
            name="bio"
            value={temporaryProfileData.bio || ""}
            onChange={onInputChange}
            rows="4"
            className="input-field-edit bio-textarea"
            placeholder="Bio"
          />

          <div className="edit-buttons">
            <button className="btn save-btn" onClick={onSaveProfile} type="button">
              Save Changes
            </button>
            <button className="btn cancel-btn" onClick={onCancelEdit} type="button">
              Cancel
            </button>
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
  const fileInputReference = useRef(null);

  // Add and remove body class for background
  useEffect(() => {
    // Add class when component mounts
    document.body.classList.add('profile-page-active');
    
    // Clean up function to remove class when component unmounts
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
      setErrorMessage("");
  
      const fetchedUserProfile = await getMyProfile();
      setUserProfile(fetchedUserProfile);
      setTemporaryProfileData(fetchedUserProfile);
  
      try {
        const fetchedUserStats = await getProfileStats();
        setUserStatistics(fetchedUserStats);
      } catch {
        setUserStatistics({
          activeHabits: 0,
          gratitudeEntries: 0,
          longestStreak: 0,
          daysTracked: 0,
        });
      }
  
      // Fetch all achievements and earned achievements from backend
      try {
        const fetchedAllAchievements = await getUserAchievements();
        console.log("All achievements:", fetchedAllAchievements);
        setAllAchievementsList(fetchedAllAchievements);
        
        const fetchedEarnedAchievements = await getEarnedAchievements();
        console.log("Earned achievements:", fetchedEarnedAchievements);
        setEarnedAchievementsList(fetchedEarnedAchievements);
      } catch (error) {
        console.error("Failed to load achievements:", error);
        console.error("Error details:", error.response?.data || error.message);
        setAllAchievementsList([]);
        setEarnedAchievementsList([]);
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
      setErrorMessage(`Failed to load profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      const validFileTypes = ['image/png', 'image/jpeg'];
      
      if (!validFileTypes.includes(selectedFile.type)) {
        setErrorMessage("Please upload only PNG or JPEG files");
        return;
      }
      
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setTemporaryProfileData({ ...temporaryProfileData, profile_picture: fileReader.result });
        setErrorMessage("");
      };
      fileReader.onerror = () => {
        setErrorMessage("Failed to read file");
      };
      fileReader.readAsDataURL(selectedFile);
    } else {
      setTemporaryProfileData({ ...temporaryProfileData, [name]: value });
    }
  };

  const handleSaveProfile = async () => {
    try {
      let updatedProfileData = {
        name: temporaryProfileData.name,
        bio: temporaryProfileData.bio,
      };

      // If profile picture was changed and is a data URL, upload it first
      if (temporaryProfileData.profile_picture && temporaryProfileData.profile_picture.startsWith('data:')) {
        try {
          // Convert data URL to File object
          const dataUrl = temporaryProfileData.profile_picture;
          const dataParts = dataUrl.split(',');
          const mimeType = dataParts[0].match(/:(.*?);/)[1];
          const base64Data = atob(dataParts[1]);
          const dataLength = base64Data.length;
          const uint8Array = new Uint8Array(dataLength);
          for (let i = 0; i < dataLength; i++) {
            uint8Array[i] = base64Data.charCodeAt(i);
          }
          const imageFile = new File([uint8Array], 'avatar.jpg', { type: mimeType });
          
          // Pass the File object directly
          await uploadAvatar(imageFile);
        } catch (uploadError) {
          console.error("Failed to upload avatar:", uploadError);
          console.error("Upload error details:", uploadError.response?.data || uploadError.message);
          setErrorMessage("Failed to upload profile picture. Please try again.");
          return;
        }
      }

      // Update the rest of the profile (name, bio)
      const updatedProfile = await updateProfile(updatedProfileData);
      setUserProfile(updatedProfile);
      setTemporaryProfileData(updatedProfile);
      setIsEditingProfile(false);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save profile");
    }
  };

  const handleCancelEdit = () => {
    setTemporaryProfileData(userProfile);
    setIsEditingProfile(false);
  };

  const handleChangeProfileImageClick = () => {
    if (fileInputReference.current) {
      fileInputReference.current.click();
    }
  };

  const handleSettingsButtonClick = () => {
    console.log("Settings clicked");
  };

  const formatMemberSinceDate = () => {
    if (!userProfile?.created_at) return "—";
    return new Date(userProfile.created_at).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) return <p className="loading">Loading...</p>;
  if (!userProfile) return <p className="loading">Failed to load profile</p>;

  return (
    <div className="profile-page">
      <ProfileHeader 
        profileData={userProfile} 
        onEditProfileClick={() => setIsEditingProfile(true)}
        onSettingsButtonClick={handleSettingsButtonClick}
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
          onChangeProfileImageClick={handleChangeProfileImageClick}
          onProfileImageFileChange={handleInputChange}
        />
      )}

      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </div>
  );
}