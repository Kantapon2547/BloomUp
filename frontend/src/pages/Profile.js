import React, { useState, useEffect, useRef } from "react";
import { getMyProfile, updateProfile, uploadAvatar } from "../services/userService";
import { getProfileStats } from "../services/statsService";
import { getUserAchievements, getEarnedAchievements } from "../services/achievementService";
import "./style/Profile.css";

// Constants
const STATS_CONFIG = [
  { key: "activeHabits", icon: "target", label: "ACTIVE HABITS" }, 
  { key: "longestStreak", icon: "local_fire_department", label: "LONGEST STREAK" },
  { key: "gratitudeEntries", icon: "favorite", label: "GRATITUDE ENTRIES" }, 
  { key: "daysTracked", icon: "calendar_month", label: "DAYS TRACKED" } 
];

const RECENT_ACTIVITIES = [
  { icon: "✅", text: "Completed Morning Meditation", time: "2 hours ago" },
  { icon: "📝", text: "Logged Daily Gratitude", time: "5 hours ago" },
  { icon: "💧", text: "Drank 8 glasses of water", time: "Yesterday" },
  { icon: "🏃‍♂️", text: "Completed evening run", time: "Yesterday" }
];

const ProfileHeader = ({ profile, onEditClick, onSettingsClick, getMemberSinceText }) => (
  <div className="profile-card profile-header-card">
    <div className="profile-header-content">
      <div className="profile-image-section">
        <div className="profile-image-container">
          {profile.profile_picture ? (
            <img
              src={profile.profile_picture}
              alt={profile.name}
              className="profile-image"
            />
          ) : (
            <div className="profile-emoji-default">🌸</div>
          )}
        </div>
        <div className="edit-profile-badge" onClick={onEditClick} title="Edit Profile">
          ✏️
        </div>
      </div>

      <div className="profile-info-section">
        <div className="profile-header-top">
          <h1 className="profile-name-large">{profile.name}</h1>
          <button className="settings-btn" onClick={onSettingsClick}>
            ⚙️ Log out
          </button>
        </div>
        
        <p className="profile-bio-text">{profile.bio || "No bio yet"}</p>

        <div className="profile-tags">
          <div className="profile-tag-item">
            <span className="tag-emoji">🌱</span> Wellness Explorer
          </div>
          <div className="member-since-text">
            Member since {getMemberSinceText()}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StatsSection = ({ stats }) => (
  <div className="stats-cards-container">
    <div className="stats-cards-grid">
      {STATS_CONFIG.map(({ key, icon, label }) => (
        <div key={key} className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">{icon}</span>
          </div>
          <div className="stat-number">{stats[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const AchievementsCard = ({ achievements, earnedCount, totalCount, onViewAll }) => {
  return (
    <div className="profile-card achievements-card">
      <div className="card-header">
        <h2 className="card-title">Achievements</h2>
        <button className="view-all-btn" onClick={onViewAll}>
          {earnedCount}/{totalCount}
        </button>
      </div>
      <div className="achievements-content">
        <div className="achievement-progress">
          <div className="progress-number">
            {earnedCount}/{totalCount}
          </div>
          <div className="progress-label">Total Achievements</div>
        </div>
        <div className="achievements-list">
          {achievements.slice(0, 3).map(achievement => (
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
      {RECENT_ACTIVITIES.map((activity, index) => (
        <ActivityItem key={index} activity={activity} />
      ))}
    </div>
  </div>
);

const ActivityItem = ({ activity }) => (
  <div className="activity-item">
    <div className="activity-icon">{activity.icon}</div>
    <div className="activity-content">
      <div className="activity-text">{activity.text}</div>
      <div className="activity-time">{activity.time}</div>
    </div>
  </div>
);

const AchievementsModal = ({ achievements, onClose }) => {
  const earnedCount = achievements.filter(a => a.is_earned).length;
  const totalCount = achievements.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content achievements-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Achievements</h2>
          <div className="achievements-summary">
            {earnedCount} of {totalCount} unlocked
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="achievements-grid">
          {achievements.map((achievement) => (
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
  tempProfile, 
  fileInputRef, 
  onClose, 
  onChange, 
  onSave, 
  onCancel, 
  onChangeImageClick, 
  onFileChange 
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Edit Profile</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="edit-form">
        <div className="profile-image-edit-section">
          <div className="profile-image-container-edit">
            <img
              src={tempProfile.profile_picture || "/default-avatar.png"}
              alt={tempProfile.name}
              className="profile-image-edit"
            />
          </div>
          <button className="change-image-btn-edit" onClick={onChangeImageClick} type="button">
            Change Photo
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept=".png,.jpeg,.jpg,image/png,image/jpeg"
            style={{ display: "none" }}
          />
        </div>

        <div className="form-fields">
          <input
            type="text"
            name="name"
            value={tempProfile.name || ""}
            onChange={onChange}
            className="input-field-edit"
            placeholder="Name"
          />
          <textarea
            name="bio"
            value={tempProfile.bio || ""}
            onChange={onChange}
            rows="4"
            className="input-field-edit bio-textarea"
            placeholder="Bio"
          />

          <div className="edit-buttons">
            <button className="btn save-btn" onClick={onSave} type="button">
              Save Changes
            </button>
            <button className="btn cancel-btn" onClick={onCancel} type="button">
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
  const [profile, setProfile] = useState(null);
  const [tempProfile, setTempProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError("");

      const userProfile = await getMyProfile();
      setProfile(userProfile);
      setTempProfile(userProfile);

      try {
        const userStats = await getProfileStats();
        setStats(userStats);
      } catch {
        setStats({
          activeHabits: 0,
          gratitudeEntries: 0,
          longestStreak: 0,
          daysTracked: 0,
        });
      }

      // Fetch and earned all achievements from backend
      try {
        const allAchievements = await getUserAchievements();
        setAchievements(allAchievements);
        
        const earned = await getEarnedAchievements();
        setEarnedAchievements(earned);
      } catch (e) {
        console.error("Failed to load achievements:", e);
        setAchievements([]);
        setEarnedAchievements([]);
      }
    } catch (e) {
      console.error("Failed to load profile data:", e);
      setError(`Failed to load profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ['image/png', 'image/jpeg'];
      
      if (!validTypes.includes(file.type)) {
        setError("Please upload only PNG or JPEG files");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        setTempProfile({ ...tempProfile, profile_picture: reader.result });
        setError("");
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsDataURL(file);
    } else {
      setTempProfile({ ...tempProfile, [name]: value });
    }
  };

  const handleSave = async () => {
    try {
      let updatedData = {
        name: tempProfile.name,
        bio: tempProfile.bio,
      };

      // If profile picture was changed and is a data URL, upload it first
      if (tempProfile.profile_picture && tempProfile.profile_picture.startsWith('data:')) {
        try {
          // Convert data URL to File object
          const dataUrl = tempProfile.profile_picture;
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          const n = bstr.length;
          const u8arr = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          const file = new File([u8arr], 'avatar.jpg', { type: mime });
          
          // Pass the File object directly
          await uploadAvatar(file);
        } catch (uploadError) {
          console.error("Failed to upload avatar:", uploadError);
          console.error("Upload error details:", uploadError.response?.data || uploadError.message);
          setError("Failed to upload profile picture. Please try again.");
          return;
        }
      }

      // Update the rest of the profile (name, bio)
      const updated = await updateProfile(updatedData);
      setProfile(updated);
      setTempProfile(updated);
      setIsEditing(false);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to save profile");
    }
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  const handleChangeImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
  };

  const getMemberSinceText = () => {
    if (!profile?.created_at) return "—";
    return new Date(profile.created_at).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (!profile) return <p className="loading">Failed to load profile</p>;

  return (
    <div className="profile-page">
      <ProfileHeader 
        profile={profile} 
        onEditClick={() => setIsEditing(true)}
        onSettingsClick={handleSettingsClick}
        getMemberSinceText={getMemberSinceText} 
      />

      {stats && (
        <>
          <StatsSection stats={stats} />
          
          <div className="content-grid">
            <AchievementsCard 
              achievements={earnedAchievements}
              earnedCount={earnedAchievements.length}  
              totalCount={achievements.length}  
              onViewAll={() => setShowAchievementsModal(true)} 
            />
            <RecentActivityCard />
          </div>
        </>
      )}

      {showAchievementsModal && (
        <AchievementsModal 
          achievements={achievements} 
          onClose={() => setShowAchievementsModal(false)} 
        />
      )}

      {isEditing && (
        <EditProfileModal
          tempProfile={tempProfile}
          fileInputRef={fileInputRef}
          onClose={() => setIsEditing(false)}
          onChange={handleChange}
          onSave={handleSave}
          onCancel={handleCancel}
          onChangeImageClick={handleChangeImageClick}
          onFileChange={handleChange}
        />
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
