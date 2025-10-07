import React, { useState, useEffect, useRef } from "react";
import "./style/Profile.css";
import { getMyProfile, updateProfile, uploadAvatar } from "../services/userService";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tempProfile, setTempProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
        setTempProfile(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempProfile({ ...tempProfile, [name]: value });
  };

  const handleSave = async () => {
    try {
      const updated = await updateProfile({
        name: tempProfile.name,
        bio: tempProfile.bio,
      });
      setProfile(updated);
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
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
      setTempProfile(updated);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="profile-page">

      {/* Profile content */}
      <div className="profile-container">
        <div className="profile-card">
          {error && <p style={{ color: "red" }}>{error}</p>}

          <div className="profile-picture">
            {profile.profile_picture ? (
              <img src={profile.profile_picture} alt="Profile" />
            ) : (
              <div className="placeholder">No Image</div>
            )}
          </div>

          {isEditing && (
            <button
              onClick={handleChangeImageClick}
              className="btn change-image"
            >
              Change Image
            </button>
          )}

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="input-file"
          />

          {!isEditing ? (
            <>
              <h2 className="profile-name">{profile.name}</h2>
              <p className="profile-email">{profile.email}</p>
              <p className="profile-bio">{profile.bio}</p>
              <div className="btn-center">
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn edit"
                >
                  Edit
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                type="text"
                name="name"
                value={tempProfile.name}
                onChange={handleChange}
                className="input-field"
              />
              <textarea
                name="bio"
                value={tempProfile.bio}
                onChange={handleChange}
                rows="4"
                className="input-field bio-field"
              />
              <div className="btn-center">
                <button onClick={handleSave} className="btn save">
                  Save
                </button>
                <button onClick={handleCancel} className="btn cancel">
                  Cancel
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;
