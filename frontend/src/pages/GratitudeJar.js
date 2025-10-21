import React, { useState, useEffect, useRef, useMemo } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink } from "lucide-react";

//==============================================================================
// 1. IMPORT ASSETS
//==============================================================================
import jarImage from '../assets/jar.png';
import star1 from '../assets/star small.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';

//==============================================================================
// 2. VISUAL & UTILITY COMPONENTS
//==============================================================================

const starImagePaths = [star1, star2, star3, star4];

// Component for the main Jar visual
const JarVisual = ({ onClick, starCount, isShaking }) => (
  <div className={`jar-container ${isShaking ? 'shake' : ''}`} onClick={onClick} title="Click to view a random memory">
    <img src={jarImage} alt="Gratitude Jar" className="jar-image" />
    <span className="jar-text">
      {starCount > 0 ? `${starCount} Gratitudes` : "Your jar is empty"}
    </span>
  </div>
);

// Component for a single star inside the jar
const GratitudeStar = ({ style, imageSrc }) => (
  <img src={imageSrc} alt="Gratitude star" className="gratitude-star" style={style} />
);

// Component for the star that drops in when a new entry is added
const AnimatedNewStar = ({ onAnimationEnd }) => {
  const starSrc = starImagePaths[Math.floor(Math.random() * starImagePaths.length)];
  return (
    <img
      src={starSrc}
      alt="New gratitude star"
      className="new-star-animation"
      onAnimationEnd={onAnimationEnd}
    />
  );
};

// Component for the modal that shows entry details
const GratitudeDetailModal = ({ entry, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          <X size={24} />
        </button>
        {entry.image && <img src={entry.image} alt="Gratitude" className="modal-image" />}
        <div className="modal-details">
          <div className="entry-header">
            <span className={`category ${categoryColors[entry.category] || "general"}`}>
              {entry.category}
            </span>
            <span className="date">{entry.date}</span>
          </div>
          <p className="modal-text">{entry.text}</p>
        </div>
      </div>
    </div>
  );
};

//==============================================================================
// 3. CONSTANTS & HELPERS
//==============================================================================

const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  "Relationships": "relationships",
  "Achievements": "achievements",
  "Nature": "nature",
  "Learning": "learning",
  "Family": "family",
  "Work": "work",
};

//==============================================================================
// 4. MAIN GRATITUDE JAR COMPONENT
//==============================================================================

const GratitudeJar = () => {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("gratitudeEntries");
    return saved ? JSON.parse(saved) : [];
  });
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // State for animations
  const [isShaking, setIsShaking] = useState(false);
  const [shuffleTrigger, setShuffleTrigger] = useState(0);
  const [showNewStar, setShowNewStar] = useState(false);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
  }, [entries]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate star positions, re-calculating when entries or the shuffle trigger change
  const starData = useMemo(() => {
    return entries.map(() => ({
      top: `${Math.random() * 30 + 30}%`, // Constrained vertical position
      left: `${Math.random() * 30 + 30}%`, // Constrained horizontal position
      transform: `rotate(${Math.random() * 40 - 20}deg)`,
      animationDelay: `${Math.random() * 2}s`,
      imageSrc: starImagePaths[Math.floor(Math.random() * starImagePaths.length)]
    }));
  }, [entries, shuffleTrigger]);

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
      setError("");
    } else {
      setError("⚠️ Please select a valid image file.");
    }
  };

  const addEntry = () => {
    if (!text.trim()) return setError("⚠️ Please enter your gratitude message.");
    if (!category) return setError("⚠️ Please select a category before adding your entry.");
    if (text.length > 200) return setError("⚠️ Your gratitude entry should not exceed 200 characters.");

    setError("");
    const newEntry = { id: Date.now(), text, category, date: formatDate(new Date()), image };

    setShowNewStar(true);

    setEntries([newEntry, ...entries]);

    setText("");
    setCategory("");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteEntry = (id) => {
    const element = document.getElementById(`entry-${id}`);
    if (element) {
      element.classList.add("removing");
      setTimeout(() => setEntries(entries.filter((entry) => entry.id !== id)), 300);
    }
  };

  const showRandomGratitude = () => {
    if (entries.length === 0 || isShaking) return;

    setIsShaking(true);
    setShuffleTrigger(prev => prev + 1);

    const randomIndex = Math.floor(Math.random() * entries.length);
    setSelectedEntry(entries[randomIndex]);

    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  const handleCardClick = (entry) => {
    setSelectedEntry(entry);
  };

  const handleCloseModal = () => {
    setSelectedEntry(null);
  };

  const today = formatDate(new Date());

  return (
    <div className="app-container">
      <main className="main-content">
        <h1 className="page-title">Shake the Jar for a Memory ✨</h1>

        <div className="jar-area">
          {showNewStar && <AnimatedNewStar onAnimationEnd={() => setShowNewStar(false)} />}

          <JarVisual
            onClick={showRandomGratitude}
            starCount={entries.length}
            isShaking={isShaking}
          />
          <div className="stars-container">
            {entries.map((entry, index) => (
              <GratitudeStar
                key={entry.id}
                style={starData[index]}
                imageSrc={starData[index].imageSrc}
              />
            ))}
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-card purple">
            <h2>{entries.length}</h2>
            <p>Total {entries.length === 1 ? "Entry" : "Entries"}</p>
          </div>
          <div className="stat-card blue">
            <h2>{entries.filter((e) => e.date === today).length}</h2>
            <p>Added Today</p>
          </div>
        </div>

        <div className="entry-form">
          <h3>➕ What are you grateful for today?</h3>
          <textarea
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 200) {
                setText(value);
                if (error.includes("200 characters")) setError("");
              } else {
                setError("⚠️ Your gratitude entry should not exceed 200 characters.");
              }
            }}
            placeholder="I'm grateful for..."
          />

          <div className="controls-row">
            <div className="custom-dropdown" ref={dropdownRef}>
              <button className={`dropdown-toggle ${category ? "selected" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}>
                {category || "Select Category"}
              </button>
              {open && (
                <ul className="dropdown-list">
                  {Object.keys(categoryColors).map((cat) => (
                    <li key={cat} onClick={() => { setCategory(cat); setOpen(false); setError(""); }}>
                      {cat}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} style={{ display: "none" }} />
            <button className="image-upload-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()} title="Add an image">
              <ImagePlus size={20} />
              <span>{image ? "Image Selected" : "Add Image"}</span>
            </button>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button onClick={addEntry}>Add Entry</button>
        </div>

        <h2 className="collection-title">Your Gratitude Collection</h2>
        <div className="entries-grid">
          {entries.map((entry) => (
            <div key={entry.id} id={`entry-${entry.id}`} className="entry-card" onClick={() => handleCardClick(entry)}>
              {entry.image && <ExternalLink className="open-in-new-icon" title="This entry has an image" />}
              <div className="entry-content">
                <div className="entry-header">
                  <span className={`category ${categoryColors[entry.category] || "general"}`}>
                    {entry.category}
                  </span>
                  <span className="date">{entry.date}</span>
                </div>
                <p className="entry-text">{entry.text}</p>
                <Trash2
                  className="delete-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEntry(entry.id);
                  }}
                  title="Delete entry"
                />
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedEntry && <GratitudeDetailModal entry={selectedEntry} onClose={handleCloseModal} />}
    </div>
  );
};

export default GratitudeJar;