import React, { useState, useRef } from "react";
import "./Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState({
    picture: "",
    name: "John Doe",
    email: "john.doe@example.com",
    bio: "This is my short bio.",
  });

  const [tempProfile, setTempProfile] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);

  const fileInputRef = useRef(null);

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
    <div className="profile-container">
      <div className="profile-card">
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
            <div className="btn-center">
              <button onClick={() => setIsEditing(true)} className="btn edit">
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
  );
};

export default Profile;
