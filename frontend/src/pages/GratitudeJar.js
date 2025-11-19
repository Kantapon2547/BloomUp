import React, { useState, useEffect, useRef } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink, Send, Image } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import jarImage from '../assets/jar-wo-lid.png';
import star1 from '../assets/star.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';
import star5 from '../assets/star-5.png';

gsap.registerPlugin(ScrollTrigger);

// CONSTANTS
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
    <div
      style={{
        position: 'absolute',
        top: `${baseTop}%`,
        left: `${baseLeft}%`,
        transform: `rotate(${rotate}deg) translateY(${scrollY}px)`,
        animation: `float ${floatDuration}s ease-in-out infinite`,
      }}
    >
      <img
        src={starImagePaths[Math.floor(Math.random() * starImagePaths.length)]}
        className="gratitude-star"
        alt="star"
        style={{
          width: '60px',
          height: 'auto',
          opacity: 0,
          animation: `floatIn 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`,
        }}
      />
    </div>
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

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    if (dateString.includes('T')) {
      return dateString.split('T')[0];
    } else if (dateString.includes(' ')) {
      return dateString.split(' ')[0];
    } else {
      return dateString;
    }
  };

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
          </div>
          <p className="modal-text">{entry.text}</p>
          <span className="date">{formatDateForDisplay(entry.date)}</span>
        </div>
      </div>
    </div>
  );
};

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
  const [todayEntriesCount, setTodayEntriesCount] = useState(0);
  
  const statsContainerRef = useRef(null);
  const entriesGridRef = useRef(null);

  useEffect(() => { 
    fetchEntries(); 
  }, []);

  useEffect(() => {
    updateTodayEntriesCount();
  }, [entries]);

  useEffect(() => {
    setupScrollAnimations();
  }, [entries]);

  const updateTodayEntriesCount = () => {
    const today = new Date();
    const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    const todayCount = entries.filter(entry => {
      if (!entry.date) return false;
      return entry.date === todayFormatted;
    }).length;
    
    setTodayEntriesCount(todayCount);
  };

  const setupScrollAnimations = () => {
    // Clear previous scroll triggers
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());

    // Stat cards animation
    const statCards = document.querySelectorAll(".gratitude-stat-card");
    statCards.forEach((card, index) => {
      gsap.set(card, { opacity: 0, y: 20 });
      gsap.to(
        card,
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: index * 0.1,
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 70%",
            scrub: 0.5,
            markers: false,
          },
        }
      );
    });

    // Entry cards staggered animation
    const entryCards = document.querySelectorAll(".entry-card");
    entryCards.forEach((card, index) => {
      gsap.set(card, { opacity: 0, y: 20 });
      gsap.to(
        card,
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay: index * 0.08,
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            end: "top 75%",
            scrub: 0.5,
            markers: false,
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
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
      
      const processedEntries = data.map(e => ({
        ...e,
        image: makeAbsoluteImageUrl(e.image),
        date: e.date
      }));

      setEntries(processedEntries);
    } catch (err) { 
      console.error("Failed to fetch entries:", err); 
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = (newEntry) => {
    setShowNewStar(true);
    const entryWithDate = { ...newEntry };
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

  const formatDateForDisplay = (dateString) => {
    if (!dateString) {
      const today = new Date();
      return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    }
    return dateString;
  };

  const getEntriesText = () => {
    return entries.length === 1 ? "Total Entry" : "Total Entries";
  };

  return (
    <div className="app-container">
      
        {/* Jar Section */}
        <section className="main-content">
          <div className="jar-area">
            <img src={jarImage} alt="Jar" className="gratitude-jar-image" />
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

        <section className="collection-section">
          <div className="stats-container" ref={statsContainerRef}>
            <div className="gratitude-stat-card purple">
              <h2>{entries.length}</h2>
              <p>{getEntriesText()}</p>
            </div>
            
            <div className="gratitude-stat-card blue">
              <h2>{todayEntriesCount}</h2>
              <p>Added Today</p>
            </div>
          </div>
          
          <h2 className="collection-title">Your Gratitude Collection</h2>
          
          <div className="entries-grid" ref={entriesGridRef}>
            {entries.map((entry, index) => (
              <EntryCard 
                key={entry.id} 
                entry={{
                  ...entry,
                  date: formatDateForDisplay(entry.date)
                }}
                index={index} 
                handleCardClick={setSelectedEntry} 
                deleteEntry={deleteEntry} 
              />
            ))}
          </div>
        </section>
      
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