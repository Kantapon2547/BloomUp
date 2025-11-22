import { useState, useEffect, useRef } from "react";
import jarImage from '../assets/jar.png';
import star1 from '../assets/star.png';
import star2 from '../assets/star-2.png';
import star3 from '../assets/star-3.png';
import star4 from '../assets/star-4.png';
import "./Jar.css";

const starImages = [star1, star2, star3, star4];

// check if a position is valid
const isPositionValid = (x, y, usedPositions, minDistance) => {
  return usedPositions.every(pos => {
    const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
    return distance > minDistance;
  });
};

function GratitudeJar() {
  const [isOpen, setIsOpen] = useState(false);
  const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const jarRef = useRef(null);
  const starsRef = useRef(null);

  // Generate random scattered positions for stars with spacing
  const generateStarPositions = (entries) => {
    const usedPositions = [];
    const minDistance = 60; 
    const maxX = 120; 
    const maxY = 150; 
    
    return entries.map((entry, index) => {
      let randomX, randomY, isValid;
      let attempts = 0;
      
      // Keep trying random positions until we find one that doesn't overlap
      do {
        randomX = (Math.random() - 0.5) * maxX; 
        randomY = (Math.random() - 0.5) * maxY; 
        
        // Check if this position is far enough from others
        isValid = isPositionValid(randomX, randomY, usedPositions, minDistance);
        
        attempts++;
      } while (!isValid && attempts < 50);
      
      usedPositions.push({ x: randomX, y: randomY });
      
      return {
        id: entry.id || entry.gratitude_id || index,
        text: entry.text || entry.content || "",
        category: entry.category || "",
        posX: randomX,
        posY: randomY,
        rotation: Math.random() * 360,
        delay: index * 0.05,
        starImage: starImages[Math.floor(Math.random() * starImages.length)],
      };
    });
  };

  // Fetch gratitude entries from db
  useEffect(() => {
    const fetchGratitudes = async () => {
      try {
        const getToken = () => {
        const token = localStorage.getItem("token");
        console.log("🔍 Jar.js Token:", token ? token.substring(0, 20) + "..." : "null");
        
        if (!token || token === "null" || token === "undefined") {
          return null;
        }
        
        if (token.startsWith("eyJ") && !token.startsWith("Bearer ")) {
          return `Bearer ${token}`;
        }
        
        return token;
      };

      // Then use it:
      const token = getToken();
        const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
        
        console.log("Token:", token);
        console.log("API URL:", API);
        
        const response = await fetch(`${API}/gratitude/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log("Data received:", data);
          const entriesArray = Array.isArray(data) ? data : [];
          
          // Generate random positions for each star
          const entriesWithPositions = generateStarPositions(entriesArray);
          
          console.log("Entries with positions:", entriesWithPositions);
          setGratitudeEntries(entriesWithPositions);
        } else {
          const text = await response.text();
          console.error("Error response:", response.status, text);
          setGratitudeEntries([]);
        }
      } catch (error) {
        console.error("Failed to fetch gratitude entries:", error);
        setGratitudeEntries([]);
      }
    };

    fetchGratitudes();
  }, []);

  // Trigger shake animation 
  useEffect(() => {
    if (isOpen && jarRef.current) {
      console.log("Jar opened, starting shake animation");
      setIsShaking(true);
      setSelectedCard(null); // Clear previous card
      
      setTimeout(() => {
        setIsShaking(false);
        
        // Show random gratitude card after shaking stops
        if (gratitudeEntries.length > 0) {
          const randomIndex = Math.floor(Math.random() * gratitudeEntries.length);
          setSelectedCard(gratitudeEntries[randomIndex]);
          console.log("Showing card:", gratitudeEntries[randomIndex]);
        }
      }, 2000);
    }
  }, [isOpen, gratitudeEntries]);

  useEffect(() => {
    console.log("isOpen:", isOpen, "gratitudeEntries:", gratitudeEntries.length);
  }, [isOpen, gratitudeEntries]);

  const handleJarClick = () => {
    if (isOpen) {
      const newPositions = generateStarPositions(gratitudeEntries);
      setGratitudeEntries(newPositions);
      
      // Small delay to let positions update before shaking
      setTimeout(() => {
        setIsShaking(true);
        setSelectedCard(null);
        
        setTimeout(() => {
          setIsShaking(false);
          if (newPositions.length > 0) {
            const randomIndex = Math.floor(Math.random() * newPositions.length);
            setSelectedCard(newPositions[randomIndex]);
          }
        }, 2000);
      }, 100);
    } else {
      setSelectedCard(null);
      setIsOpen(true);
    }
  };

  const handleImageClick = () => {
    setIsShaking(true);
    setSelectedCard(null);
    setTimeout(() => {
      setIsShaking(false);
      if (gratitudeEntries.length > 0) {
        const randomIndex = Math.floor(Math.random() * gratitudeEntries.length);
        setSelectedCard(gratitudeEntries[randomIndex]);
      }
    }, 2000);
  };

  return (
    <>
      <button
        onClick={handleJarClick}
        className="gratitude-jar-btn"
        aria-label="Open gratitude jar"
        title="Open Gratitude Jar"
      >
        🫙
      </button>

      {/* Jar Container */}
      {isOpen && (
        <div className="gratitude-jar-overlay" onClick={() => {
          setSelectedCard(null);
          setIsOpen(false);
        }} style={{ display: 'flex' }}>
          <div
            className="gratitude-jar-container"
            onClick={(e) => e.stopPropagation()}
            ref={jarRef}
          >
            <div className={`jar-wrapper ${isShaking ? "shaking" : ""}`}>
              {/* Jar Image - Clickable */}
              <img 
                src={jarImage} 
                alt="Gratitude Jar" 
                className="jar-image"
                style={{
                  width: '450px',
                  height: '560px',
                  objectFit: 'contain',
                  cursor: 'pointer'
                }}
                onClick={handleImageClick}
              />

              {/* Stars Inside Jar */}
              <div className="jar-stars" ref={starsRef}>
                {gratitudeEntries.length > 0 ? (
                  gratitudeEntries.map((entry, index) => (
                    <button
                      key={entry.id || index}
                      className={`jar-star ${isShaking ? "star-shaking" : ""}`}
                      onClick={() => setSelectedCard(entry)}
                      style={{
                        "--star-delay": `${entry.delay}s`,
                        "--position-x": `${entry.posX}px`,
                        "--position-y": `${entry.posY}px`,
                        "--rotation": `${entry.rotation}deg`,
                      }}
                      title={entry.text}
                    >
                      <img src={entry.starImage} alt="star" className="star-icon" />
                      <span className="star-text">{entry.text}</span>
                    </button>
                  ))
                ) : (
                  <p className="no-gratitude">
                    No gratitudes yet. Add one to fill the jar! ✨
                  </p>
                )}
              </div>
            </div>

            <button
              className="close-jar"
              onClick={() => setIsOpen(false)}
              aria-label="Close jar"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {selectedCard && (
        <div
          className="card-overlay"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="gratitude-card"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="card-star">
              <img 
                src={selectedCard.starImage} 
                alt="star" 
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            </div>
            
            <p className="card-text">
              {selectedCard.text}
            </p>
            
            <button
              onClick={() => setSelectedCard(null)}
              className="card-button"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default GratitudeJar;
