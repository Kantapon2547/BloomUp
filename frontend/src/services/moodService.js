const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("Authentication token not found in localStorage ('access_token').");
  }

  return headers;
};


// --- Service Function to Get Weekly Mood Summary ---
export const getWeeklyMoodSummary = async () => {
  try {
    const response = await fetch(`${API_URL}/mood/week/summary`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch mood summary: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error("Error in getWeeklyMoodSummary:", error);
    return {
      average_mood: 0,
      logs_count: 0,
    };
  }
};