import React, { useState, useEffect, useRef } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink, Send, Image } from "lucide-react";
import { motion } from "framer-motion";

// 1. IMPORT ASSETS
import jarImage from '../assets/jar-wo-lid.png';
import star1 from '../assets/star.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';
import star5 from '../assets/star-5.png';

// 2. CONSTANTS
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

// --- Utility ---
const makeAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
};

const AnimatedNewStar = ({ onAnimationEnd }) => {
  const starSrc = starImagePaths[Math.floor(Math.random() * starImagePaths.length)];
  return <img src={starSrc} alt="New star" className="new-star-animation" onAnimationEnd={onAnimationEnd} />;
};

// --- Star floating with scroll parallax ---
const FloatingStar = ({ index }) => {
  const baseTop = Math.random() * 40 + 50;
  const baseLeft = Math.random() * 40 + 30;
  const rotate = Math.random() * 40 - 20;
  const floatAmplitude = Math.random() * 10 + 5;
  const floatDuration = Math.random() * 3 + 2;
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY * 0.0005);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.img
      key={index}
      src={starImagePaths[Math.floor(Math.random() * starImagePaths.length)]}
      className="gratitude-star"
      style={{
        top: `${baseTop}%`,
        left: `${baseLeft}%`,
        transform: `rotate(${rotate}deg)`,
      }}
      animate={{ y: [0, -floatAmplitude, 0], translateY: scrollY }}
      transition={{ duration: floatDuration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};

const EntryCard = ({ entry, index, handleCardClick, deleteEntry }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entryObserver]) => {
        if (entryObserver.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      id={`entry-${entry.id}`}
      className={`entry-card ${visible ? "visible" : ""}`}
      style={{ transitionDelay: `${index * 100}ms` }}
      onClick={() => handleCardClick(entry)}
    >
      {entry.image && <ExternalLink className="open-in-new-icon" />}
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
        />
      </div>
    </div>
  );
};

const GratitudeDetailModal = ({ entry, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}><X size={24} /></button>
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

// --- Form inside Jar ---
const InJarEntryForm = ({ onAddEntry, isLoading }) => {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [isCategoryOpen, setCategoryOpen] = useState(false);
  const [image, setImage] = useState(null);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) 
        setCategoryOpen(false); 
    };
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return setError("⚠️ Enter your gratitude message.");
    if (!category) return setError("⚠️ Select a category.");
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
      if (!token) return setError("⚠️ Not authenticated.");

      const res = await fetch(`${API_BASE_URL}/gratitude/`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        return setError(`⚠️ ${errData.detail || "Failed to add entry"}`);
      }

      const result = await res.json();
      if (result.image) result.image = makeAbsoluteImageUrl(result.image);
      onAddEntry(result);

      // Reset form
      setText(""); 
      setCategory(""); 
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) { 
      setError(`⚠️ ${err.message}`); 
    }
  };

  const getCategoryDisplayClass = () => {
    let className = "category-display";
    if (category) className += " has-category";
    return className;
  };

  const getImageButtonClass = () => {
    return `image-upload-btn ${image ? "has-image" : ""}`;
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        placeholder="I'm grateful for..." 
        className="entry-textarea" 
        disabled={isLoading} 
      />
      
      <div className="entry-controls">
        {/* Category dropdown - takes available space */}
        <div className="category-container">
          <div 
            className={getCategoryDisplayClass()} 
            onClick={() => setCategoryOpen(!isCategoryOpen)}
          >
            {category || "Select Category"}
            <span className="material-symbols-outlined dropdown-arrow">
              keyboard_arrow_down
            </span>
          </div>
          
          {/* Dropdown list */}
          <div className="custom-dropdown" ref={dropdownRef}>
            {isCategoryOpen && (
              <ul className="dropdown-list">
                {Object.keys(categoryColors).map((cat) => (
                  <li 
                    key={cat} 
                    onClick={() => { 
                      setCategory(cat); 
                      setCategoryOpen(false); 
                      setError(""); 
                    }}
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Image upload button */}
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange} 
          ref={fileInputRef} 
          style={{ display: "none" }} 
        />
        <button 
          type="button" 
          className={getImageButtonClass()}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={20} />
        </button>
        
        {/* Submit button */}
        <button 
          type="submit" 
          className="submit-entry-btn"
          disabled={isLoading}
        >
          <Send size={20} />
        </button>
      </div>
      
      {error && <p className="error-text">{error}</p>}
    </form>
  );
};

// --- Main Component ---
const GratitudeJar = () => {
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showNewStar, setShowNewStar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { 
    fetchEntries(); 
    setupScrollAnimations();
  }, []);

  const setupScrollAnimations = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animated');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  };

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch(`${API_BASE_URL}/gratitude/`, { 
        method: "GET", 
        headers: { 
          "Authorization": `Bearer ${token}`, 
          "Content-Type": "application/json" 
        } 
      });
      
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
     
      setEntries(
        data.map(e => ({
          ...e,
          image: makeAbsoluteImageUrl(e.image),
          date: e.date?.split("T")[0] || new Date().toISOString().split("T")[0],
        }))
      );
    } catch (err) { 
      console.error("Failed to fetch entries:", err); 
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = (newEntry) => {
    setShowNewStar(true);

    const todayDate = new Date().toISOString().split("T")[0];
    const entryWithDate = { 
      ...newEntry, 
      date: newEntry.date ? newEntry.date.split(/[ T]/)[0] : todayDate 
    };

    setEntries((prev) => [entryWithDate, ...prev]);
  };

  const deleteEntry = async (id) => {
    const el = document.getElementById(`entry-${id}`);
    if (el) el.classList.add("removing");
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/gratitude/${id}`, { 
        method: "DELETE", 
        headers: { "Authorization": `Bearer ${token}` } 
      });
      
      if (!res.ok) throw new Error("Failed to delete entry");
      
      setTimeout(() => {
        setEntries(prev => prev.filter(e => e.id !== id));
      }, 300);
    } catch(err) { 
      if (el) el.classList.remove("removing"); 
      console.error("Delete error:", err); 
    }
  };

  const getTodayEntriesCount = () => {
    const today = new Date().toISOString().split("T")[0];
    return entries.filter(entry => entry.date === today).length;
  };

  const getEntriesText = () => {
    return entries.length === 1 ? "Total Entry" : "Total Entries";
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        {/* Jar Section */}
        <section className="main-content">
          <div className="jar-area">
            <img src={jarImage} alt="Jar" className="jar-image" />
            <div className="stars-container">
              {entries.map((_, i) => (
                <FloatingStar key={i} index={i} />
              ))}
            </div>

            {showNewStar && (
              <AnimatedNewStar onAnimationEnd={() => setShowNewStar(false)} />
            )}
            
            <InJarEntryForm 
              onAddEntry={addEntry} 
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Collection Section - Now in same container */}
        <section className="collection-section">
          <div className="stats-container">
            <motion.div 
              className="stat-card purple animate-on-scroll"
              initial={{ opacity: 0, y: 50 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.6 }}
            > 
              <h2>{entries.length}</h2>
              <p>{getEntriesText()}</p>
            </motion.div>
            
            <motion.div 
              className="stat-card blue animate-on-scroll"
              initial={{ opacity: 0, y: 50 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }} 
              transition={{ duration: 0.6, delay: 0.2 }}
            > 
              <h2>{getTodayEntriesCount()}</h2>
              <p>Added Today</p>
            </motion.div>
          </div>
          
          <h2 className="collection-title animate-on-scroll">Your Gratitude Collection</h2>
          
          <div className="entries-grid">
            {entries.map((entry, index) => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                index={index} 
                handleCardClick={setSelectedEntry} 
                deleteEntry={deleteEntry} 
              />
            ))}
          </div>
        </section>
      </div>
      
      {selectedEntry && (
        <GratitudeDetailModal 
          entry={selectedEntry} 
          onClose={() => setSelectedEntry(null)} 
        />
      )}
    </div>
  );
};

export default GratitudeJar;