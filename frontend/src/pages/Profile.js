import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Load saved user from localStorage
  const savedUser = JSON.parse(localStorage.getItem("user"));

  const [profile, setProfile] = useState(
    savedUser || {
      picture: "",
      name: "John Doe",
      email: "john.doe@example.com",
      bio: "",
      extraInfo: "", // user can add extra info
    }
  );

  const [tempProfile, setTempProfile] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);

  // Update localStorage whenever profile changes
  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(profile));
  }, [profile]);

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

  const handleSave = () => {
    setProfile(tempProfile);
    setIsEditing(false);
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

  return (
    <div className="page-container">
      <Sidebar />

      <div className="profile-wrapper">
        <div className="profile-container">
          <div className="profile-card">
            {/* Profile Picture */}
            <div className="profile-picture">
              {tempProfile.picture ? (
                <img src={tempProfile.picture} alt="Profile" />
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
              name="picture"
              accept="image/*"
              onChange={handleChange}
              ref={fileInputRef}
              className="input-file"
            />

            {!isEditing ? (
              <>
                <h2 className="profile-name">{profile.name}</h2>
                <p className="profile-email">{profile.email}</p>
                <p className="profile-bio">{profile.bio}</p>
                {profile.extraInfo && (
                  <p className="profile-extraInfo">{profile.extraInfo}</p>
                )}
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
                  placeholder="Enter your name"
                  className="input-field"
                />
                <input
                  type="email"
                  name="email"
                  value={tempProfile.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="input-field"
                />
                <textarea
                  name="bio"
                  value={tempProfile.bio}
                  onChange={handleChange}
                  placeholder="Write your bio"
                  rows="4"
                  className="input-field bio-field"
                />
                <textarea
                  name="extraInfo"
                  value={tempProfile.extraInfo}
                  onChange={handleChange}
                  placeholder="Add other info (hobbies, location...)"
                  rows="3"
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

            <div className="btn-center">
              <button
                onClick={() => navigate("/habits")}
                className="btn back"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
