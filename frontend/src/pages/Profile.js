import React, { useState, useEffect, useRef } from "react";
import { getMyProfile, updateProfile, uploadAvatar } from "../services/userService";
import { getProfileStats } from "../services/statsService";
import "./style/Profile.css";

// Constants
const ACHIEVEMENTS_DATA = {
  firstHabit: {
    id: "firstHabit",
    title: "First Steps",
    description: "Created your first habit",
    icon: "🌱",
    type: "bronze",
    earned: true,
    date: "2024-09-15",
    requirement: { type: "habits", count: 1 }
  },
  streakMaster: {
    id: "streakMaster",
    title: "Streak Master",
    description: "Maintained a 7-day streak",
    icon: "🔥",
    type: "silver",
    earned: true,
    date: "2024-10-05",
    requirement: { type: "streak", count: 7 }
  },
  gratitudePro: {
    id: "gratitudePro",
    title: "Gratitude Pro",
    description: "Logged 10 gratitude entries",
    icon: "🙏",
    type: "silver",
    earned: true,
    date: "2024-10-08",
    requirement: { type: "gratitude", count: 10 }
  },
  consistencyKing: {
    id: "consistencyKing",
    title: "Consistency King",
    description: "Tracked habits for 30 days",
    icon: "👑",
    type: "gold",
    earned: false,
    date: null,
    requirement: { type: "daysTracked", count: 30 }
  },
  earlyBird: {
    id: "earlyBird",
    title: "Early Bird",
    description: "Completed 5 morning habits",
    icon: "🐦",
    type: "bronze",
    earned: false,
    date: null,
    requirement: { type: "morningHabits", count: 5 }
  }
};

const STATS_CONFIG = [
  { key: "activeHabits", icon: "eco", label: "ACTIVE HABITS" },
  { key: "longestStreak", icon: "whatshot", label: "LONGEST STREAK" },
  { key: "gratitudeEntries", icon: "favorite", label: "GRATITUDE ENTRIES" },
  { key: "daysTracked", icon: "calendar_today", label: "DAYS TRACKED" }
];

const RECENT_ACTIVITIES = [
  { icon: "✅", text: "Completed Morning Meditation", time: "2 hours ago" },
  { icon: "📝", text: "Logged Daily Gratitude", time: "5 hours ago" },
  { icon: "💧", text: "Drank 8 glasses of water", time: "Yesterday" },
  { icon: "🏃‍♂️", text: "Completed evening run", time: "Yesterday" }
];

// Helper Components
const ProfileHeader = ({ profile, onEditClick, getMemberSinceText }) => (
  <div className="profile-card profile-header-card">
    <div className="profile-header-content">
      <div className="profile-image-section">
        <div className="profile-image-container">
          <img
            src={profile.profile_picture || "/default-avatar.png"}
            alt={profile.name}
            className="profile-image"
          />
        </div>
      </div>

      <div className="profile-info-section">
        <h1 className="profile-name-large">{profile.name}</h1>
        <p className="profile-bio-text">{profile.bio || "No bio yet"}</p>

        <div className="profile-tags">
          <div className="profile-tag-item">
            <span className="tag-emoji">🌱</span> Wellness Explorer
          </div>
          <div className="member-since-text">
            Member since {getMemberSinceText()}
          </div>
        </div>

        <button className="edit-profile-btn" onClick={onEditClick}>
          Edit Profile
        </button>
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
            <span className="material-icons-outlined">{icon}</span>
          </div>
          <div className="stat-number">{stats[key]}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  </div>
);

const AchievementsCard = ({ achievements, onViewAll }) => {
  const earnedAchievements = achievements.filter(a => a.earned);
  
  return (
    <div className="profile-card achievements-card">
      <div className="card-header">
        <h2 className="card-title">Achievements</h2>
        <button className="view-all-btn" onClick={onViewAll}>
          View All
        </button>
      </div>
      <div className="achievements-content">
        <div className="achievement-progress">
          <div className="progress-number">
            {earnedAchievements.length}/{achievements.length}
          </div>
          <div className="progress-label">Total Achievements</div>
        </div>
        <div className="achievements-list">
          {earnedAchievements.slice(0, 3).map(achievement => (
            <AchievementItem key={achievement.id} achievement={achievement} />
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
  const earnedCount = achievements.filter(a => a.earned).length;
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
          {achievements.map(achievement => (
            <AchievementModalItem key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </div>
    </div>
  );
};

const AchievementModalItem = ({ achievement }) => (
  <div className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}>
    <div className="achievement-icon-large">
      {achievement.earned ? achievement.icon : "🔒"}
    </div>
    <div className="achievement-content">
      <h3 className="achievement-title">{achievement.title}</h3>
      <p className="achievement-description">{achievement.description}</p>
      {achievement.earned && achievement.date && (
        <div className="achievement-date">
          Earned {new Date(achievement.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}
        </div>
      )}
      {!achievement.earned && (
        <div className="achievement-requirement">
          Requirement: {achievement.requirement.count} {achievement.requirement.type}
        </div>
      )}
    </div>
    <div className={`achievement-badge ${achievement.type}`}>
      {achievement.type}
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
          <button className="change-image-btn-edit" onClick={onChangeImageClick}>
            Change Photo
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*"
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
            <button className="btn save-btn" onClick={onSave}>
              Save Changes
            </button>
            <button className="btn cancel-btn" onClick={onCancel}>
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

      // Convert ACHIEVEMENTS_DATA object to array and set achievements
      const achievementsArray = Object.values(ACHIEVEMENTS_DATA);
      setAchievements(achievementsArray);
    } catch (e) {
      console.error("Failed to load profile data:", e);
      setError(`Failed to load profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "picture" && files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempProfile({ ...tempProfile, picture: reader.result });
      };
      reader.readAsDataURL(files[0]);
    } else {
      setTempProfile({ ...tempProfile, [name]: value });
    }
  };

  const handleSave = async () => {
    try {
      const updated = await updateProfile({
        name: tempProfile.name,
        bio: tempProfile.bio,
      });
      setProfile(updated);
      setTempProfile(updated);
      setIsEditing(false);
    } catch (e) {
      setError(e.message);
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
        getMemberSinceText={getMemberSinceText} 
      />

      {stats && (
        <>
          <StatsSection stats={stats} />
          
          <div className="content-grid">
            <AchievementsCard 
              achievements={achievements} 
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