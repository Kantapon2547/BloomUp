import React, { useState, useEffect, useRef, useMemo } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink, Send } from "lucide-react";

import jarImage from '../assets/jar-wo-lid.png';
import star1 from '../assets/star.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';
import star5 from '../assets/star-5.png';

// API
const API_BASE_URL = "http://localhost:8000";

const starImagePaths = [star1, star2, star3, star4, star5];

const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  "Relationships": "relationships",
  "Achievements": "achievements",
  "Nature": "nature",
  "Learning": "learning",
  "Family": "family",
  "Work": "work",
};

// Star component for jar
const JarStar = ({ style, imageSrc }) => (
  <img src={imageSrc} alt="Star" className="jar-star-img" style={style} />
);

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

// make image URL 
const makeAbsoluteImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
};


const InJarEntryForm = ({ onAddEntry, isLoading }) => {
    const [text, setText] = useState("");
    const [category, setCategory] = useState("");
    const [error, setError] = useState("");
    const [isCategoryOpen, setCategoryOpen] = useState(false);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { 
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCategoryOpen(false); 
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith("image/")) {
            setError("");
        } else {
            setError("⚠️ Please select a valid image file.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return setError("⚠️ Please enter your gratitude message.");
        if (!category) return setError("⚠️ Please select a category.");
        if (text.length > 200) return setError("⚠️ Max 200 characters.");

        try {
            setError("");
            
            const formData = new FormData();
            formData.append("text", text.trim());
            formData.append("category", category);
            if (fileInputRef.current?.files[0]) {
                formData.append("file", fileInputRef.current.files[0]);
            }

            const token = localStorage.getItem("token");

            if (!token) {
                setError("⚠️ Not authenticated.");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/gratitude/`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError(`⚠️ ${errorData.detail || "Failed to add entry"}`);
                return;
            }

            const result = await response.json();
            
            if (result.image) {
                result.image = makeAbsoluteImageUrl(result.image);
            }
            
            onAddEntry(result);

            setText("");
            setCategory("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err) {
            console.error("Submit error:", err);
            setError(`⚠️ Error: ${err.message}`);
        }
    };

    return (
        <div className="entry-form-container">
            <div className="form-label">I am grateful for...</div>
            <textarea
                value={text}
                onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 200) {
                        setText(value);
                        if (error.includes("200 characters")) setError("");
                    } else {
                        setError("⚠️ Max 200 characters.");
                    }
                }}
                placeholder="Type your gratitude..."
                className="entry-textarea"
                disabled={isLoading}
            />
            <div className="entry-controls">
                <div className="custom-dropdown" ref={dropdownRef}>
                    <button 
                        type="button" 
                        className={`dropdown-toggle ${category ? "selected" : ""}`} 
                        onClick={() => setCategoryOpen(!isCategoryOpen)}
                        disabled={isLoading}
                    >
                        {category || "Category"}
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
                <button 
                    type="button" 
                    className="image-upload-btn" 
                    onClick={() => fileInputRef.current && fileInputRef.current.click()} 
                    title="Add an image"
                    disabled={isLoading}
                >
                    <ImagePlus size={20} />
                </button>

                <button 
                    type="button"
                    className="submit-entry-btn" 
                    title="Add Entry"
                    disabled={isLoading}
                    onClick={handleSubmit}
                >
                    {isLoading ? "..." : <Send size={20} />}
                </button>
            </div>
            {error && <p className="error-text">{error}</p>}
        </div>
    );
};

// core component
const GratitudeJar = () => {
    const [entries, setEntries] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isLoadingEntries, setIsLoadingEntries] = useState(true);
    const scrollContainer = useRef(null);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            setIsLoadingEntries(true);
            const token = localStorage.getItem("token");
            
            if (!token) {
                console.error("No token found.");
                setIsLoadingEntries(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/gratitude/`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const processedData = data.map(entry => ({
                ...entry,
                image: makeAbsoluteImageUrl(entry.image)
            }));
            setEntries(processedData);
        } catch (err) {
            console.error("Error fetching entries:", err);
        } finally {
            setIsLoadingEntries(false);
        }
    };

    // Generate fixed star positions based on entry count
    const starData = useMemo(() => {
        const positions = [
            { top: "25%", left: "30%" },
            { top: "35%", left: "60%" },
            { top: "45%", left: "40%" },
            { top: "55%", left: "65%" },
            { top: "50%", left: "20%" },
        ];
        return entries.slice(0, 5).map((entry, i) => ({
            ...positions[i],
            imageSrc: starImagePaths[i % starImagePaths.length]
        }));
    }, [entries]);

    const formatDate = (dateStr) => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const addEntry = (newEntry) => {
        setEntries([newEntry, ...entries]);
    };

    const deleteEntry = async (id) => {
        const element = document.getElementById(`entry-${id}`);
        if (element) {
            element.classList.add("removing");
            
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(`${API_BASE_URL}/gratitude/${id}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Failed to delete entry");
                }

                setTimeout(() => setEntries(entries.filter((e) => e.id !== id)), 300);
            } catch (err) {
                console.error("Error deleting entry:", err);
                if (element) element.classList.remove("removing");
            }
        }
    };

    const handleCardClick = (entry) => setSelectedEntry(entry);
    const handleCloseModal = () => setSelectedEntry(null);
    const today = formatDate(new Date());

    if (isLoadingEntries) {
        return <div className="app-container"><div className="loading">Loading...</div></div>;
    }

    return (
        <div className="app-container" ref={scrollContainer}>
            {/* Page 1: Jar Section - Full Screen */}
            <section className="page-1">
                <div className="stars-background">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="floating-star" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 30}%`,
                            animationDelay: `${i * 0.3}s`,
                            animationDuration: `${3 + i}s`
                        }}>⭐</div>
                    ))}
                </div>

                <div className="jar-wrapper">
                    <div className="jar-container">
                        <img src={jarImage} alt="Gratitude Jar" className="jar-image" />
                        <div className="jar-stars-overlay">
                            {starData.map((star, i) => (
                                <JarStar 
                                    key={i} 
                                    style={{ top: star.top, left: star.left }}
                                    imageSrc={star.imageSrc}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <InJarEntryForm onAddEntry={addEntry} isLoading={false} />
            </section>

            {/* Page 2: Entries Section */}
            <section className="page-2">
                <div className="page-2-content">
                    <div className="section-header">
                        <div className="stat-item">
                            <span className="stat-number">{entries.length}</span>
                            <span className="stat-label">Total Entries</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">{entries.filter((e) => e.date === today).length}</span>
                            <span className="stat-label">Added Today</span>
                        </div>
                    </div>

                    <h2 className="collection-title">Your Gratitude</h2>

                    <div className="entries-grid">
                        {entries.length === 0 ? (
                            <div className="no-entries">
                                <p>No entries yet. Start adding gratitude! 💫</p>
                            </div>
                        ) : (
                            entries.map((entry, index) => (
                                <div
                                    key={entry.id}
                                    id={`entry-${entry.id}`}
                                    className="entry-card"
                                    onClick={() => handleCardClick(entry)}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    {entry.image && <ExternalLink className="open-in-new-icon" />}
                                    <div className="entry-content">
                                        <div className="entry-header">
                                            <span className={`category ${categoryColors[entry.category] || "general"}`}>{entry.category}</span>
                                            <span className="date">{entry.date}</span>
                                        </div>
                                        <p className="entry-text">{entry.text}</p>
                                        <Trash2 className="delete-icon" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {selectedEntry && <GratitudeDetailModal entry={selectedEntry} onClose={handleCloseModal} />}
        </div>
    );
};

export default GratitudeJar;