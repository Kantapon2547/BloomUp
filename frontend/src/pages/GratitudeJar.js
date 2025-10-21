import React, { useState, useEffect, useRef } from "react";
import "./style/GratitudeJar.css";
import { Trash2, ImagePlus, X, ExternalLink } from "lucide-react";


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

const categoryColors = {
  "Simple Pleasures": "simple-pleasures",
  Relationships: "relationships",
  Achievements: "achievements",
  Nature: "nature",
  Learning: "learning",
  Family: "family",
  Work: "work",
};

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

  useEffect(() => {
    localStorage.setItem("gratitudeEntries", JSON.stringify(entries));
  }, [entries]);

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

  const handleCardClick = (entry) => {
    setSelectedEntry(entry);
  };

  const handleCloseModal = () => {
    setSelectedEntry(null);
  };

  const today = formatDate(new Date());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-container">
      <main className="main-content">
        {/* ... (Your stats and entry form JSX are unchanged) ... */}
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
                setError("");
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
              {/* --- CHANGED: ImageIcon to ExternalLink --- */}
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