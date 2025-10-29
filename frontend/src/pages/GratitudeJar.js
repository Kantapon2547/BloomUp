import React, { useState, useEffect, useRef, useMemo } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink, Send } from "lucide-react";
import { motion } from "framer-motion";

// 1. IMPORT ASSETS
import jarImage from '../assets/jar-wo-lid.png';
import star1 from '../assets/star.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';
import star5 from '../assets/star-5.png';

// 2. VISUAL & UTILITY COMPONENTS

const starImagePaths = [star1, star2, star3, star4, star5];

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

// The entry form, designed to appear inside the jar as per your sketch
const InJarEntryForm = ({ onAddEntry }) => {
    const [text, setText] = useState("");
    const [category, setCategory] = useState("");
    const [image, setImage] = useState(null);
    const [error, setError] = useState("");
    const [isCategoryOpen, setCategoryOpen] = useState(false);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCategoryOpen(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return setError("⚠️ Please enter your gratitude message.");
        if (!category) return setError("⚠️ Please select a category before adding your entry.");
        if (text.length > 200) return setError("⚠️ Your gratitude entry should not exceed 200 characters.");

        setError("");
        onAddEntry({ text, category, image });

        // Reset form
        setText("");
        setCategory("");
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <form className="entry-form" onSubmit={handleSubmit}>
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
                className="entry-textarea"
            />
            <div className="entry-controls">
                <div className="custom-dropdown" ref={dropdownRef}>
                    <button type="button" className={`dropdown-toggle ${category ? "selected" : ""}`} onClick={() => setCategoryOpen(!isCategoryOpen)}>
                        {category || "Select Category"}
                    </button>
                    {isCategoryOpen && (
                        <ul className="dropdown-list">
                            {Object.keys(categoryColors).map((cat) => (
                                <li key={cat} onClick={() => { setCategory(cat); setCategoryOpen(false); setError(""); }}>{cat}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} style={{ display: "none" }} />
                <button type="button" className="image-upload-btn" onClick={() => fileInputRef.current && fileInputRef.current.click()} title="Add an image">
                    <ImagePlus size={20} />
                </button>

                <button type="submit" className="submit-entry-btn" title="Add Entry">
                    <Send size={20} />
                </button>
            </div>
            {error && <p className="error-text">{error}</p>}
        </form>
    );
};

// 3. CONSTANTS & HELPERS

const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  "Relationships": "relationships",
  "Achievements": "achievements",
  "Nature": "nature",
  "Learning": "learning",
  "Family": "family",
  "Work": "work",
};

// 4. MAIN GRATITUDE JAR COMPONENT

const GratitudeJar = () => {
    const [entries, setEntries] = useState(
    () => JSON.parse(localStorage.getItem("gratitudeEntries") || "[]"));
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showNewStar, setShowNewStar] = useState(false);

    useEffect(() => {
      localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
    }, [entries]);

    const starData = useMemo(() => {
      return entries.map(() => ({
        top: `${Math.random() * 40 + 50}%`,
        left: `${Math.random() * 40 + 30}%`,
        transform: `rotate(${Math.random() * 40 - 30}deg)`,
        animationDelay: `${Math.random() * 2}s`,
        imageSrc: starImagePaths[Math.floor(Math.random() * starImagePaths.length)] })); }, [entries]);

    const formatDate = (date) => {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const addEntry = ({ text, category, image }) => {
        setShowNewStar(true);
        const newEntry = { id: Date.now(), text, category, date: formatDate(new Date()), image };
        setEntries([newEntry, ...entries]);
    };

    const deleteEntry = (id) => {
      const element = document.getElementById(`entry-${id}`);
      if (element) {
        element.classList.add("removing");
        setTimeout(() => setEntries(entries.filter((e) => e.id !== id)), 300);
      }
    };

    const handleCardClick = (entry) => setSelectedEntry(entry);
    const handleCloseModal = () => setSelectedEntry(null);
    const today = formatDate(new Date());

    return (
        <div className="app-container">

            {/* This is the top section that fills the screen initially */}
            <section className="main-content">
                <div className="jar-area">
                    <img src={jarImage} alt="Gratitude Jar" className="jar-image" />
                    <div className="stars-container">
                        {entries.map((entry, index) => (
                            <GratitudeStar key={entry.id} style={starData[index]} imageSrc={starData[index].imageSrc} />
                        ))}
                    </div>
                    {showNewStar && <AnimatedNewStar onAnimationEnd={() => setShowNewStar(false)} />}

                    {/* The form is now permanently inside the jar */}
                    <InJarEntryForm onAddEntry={addEntry} />
                </div>
            </section>

            {/* This is the section that appears when you scroll down */}
            <section className="collection-section">
                <div className="stats-container">
                    {/* ✨ 2. ANIMATED STATS CARDS */}
                    <motion.div
                        className="stat-card purple"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                        <h2>{entries.length}</h2>
                        <p>Total Entries</p>
                    </motion.div>
                    <motion.div
                        className="stat-card blue"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    >
                        <h2>{entries.filter((e) => e.date === today).length}</h2>
                        <p>Added Today</p>
                    </motion.div>
                </div>

                <h2 className="collection-title">Your Gratitude</h2>
                <div className="entries-grid">
                    {/* ✨ 3. ANIMATED & STAGGERED ENTRY CARDS */}
                    {entries.map((entry, index) => (
                        <motion.div
                            key={entry.id}
                            id={`entry-${entry.id}`}
                            className="entry-card"
                            onClick={() => handleCardClick(entry)}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            {entry.image && <ExternalLink className="open-in-new-icon" title="This entry has an image" />}
                            <div className="entry-content">
                                <div className="entry-header">
                                    <span className={`category ${categoryColors[entry.category] || "general"}`}>{entry.category}</span>
                                    <span className="date">{entry.date}</span>
                                </div>
                                <p className="entry-text">{entry.text}</p>
                                <Trash2 className="delete-icon" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }} title="Delete entry" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {selectedEntry && <GratitudeDetailModal entry={selectedEntry} onClose={handleCloseModal} />}
        </div>
    );
};

export default GratitudeJar;