const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("Authentication token not found in localStorage ('token').");
  }

  return headers;
};

const convertToBangkokTime = (utcDate) => {
  const bangkokOffset = 7 * 60 * 60 * 1000;
  return new Date(utcDate.getTime() + bangkokOffset);
};

const getCurrentBangkokTime = () => {
  const now = new Date();
  return convertToBangkokTime(now);
};

const getMostRecentSundayMidnightBangkok = (referenceDate = new Date()) => {
  const bangkokTime = convertToBangkokTime(referenceDate);
  const dayOfWeek = bangkokTime.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days since last Sunday
  const daysSinceSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  
  // Create a new date at midnight (Bangkok time)
  const sundayMidnight = new Date(bangkokTime);
  sundayMidnight.setUTCHours(0, 0, 0, 0);
  sundayMidnight.setUTCDate(bangkokTime.getUTCDate() - daysSinceSunday);
  
  return sundayMidnight;
};

const getNextSundayMidnightBangkok = (referenceDate = new Date()) => {
  const bangkokTime = convertToBangkokTime(referenceDate);
  const dayOfWeek = bangkokTime.getUTCDay();
  
  const daysUntilNextSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  
  const nextSundayMidnight = new Date(bangkokTime);
  nextSundayMidnight.setUTCHours(0, 0, 0, 0);
  nextSundayMidnight.setUTCDate(bangkokTime.getUTCDate() + daysUntilNextSunday);
  
  return nextSundayMidnight;
};

export const shouldRefreshWeeklyData = () => {
  try {
    const lastRefresh = localStorage.getItem("lastMoodRefreshTime");
    
    if (!lastRefresh) {
      localStorage.setItem("lastMoodRefreshTime", new Date().toISOString());
      return true;
    }

    const lastRefreshDate = new Date(lastRefresh);
    const lastRefreshSunday = getMostRecentSundayMidnightBangkok(lastRefreshDate);
    const currentSunday = getMostRecentSundayMidnightBangkok(new Date());

    const hasNewSunday = lastRefreshSunday.getTime() !== currentSunday.getTime();

    if (hasNewSunday) {
      localStorage.setItem("lastMoodRefreshTime", new Date().toISOString());
    }

    return hasNewSunday;
  } catch (error) {
    console.error("Error checking if refresh needed:", error);
    return false;
  }
};

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

    const mostRecentSunday = getMostRecentSundayMidnightBangkok();
    const nextSunday = getNextSundayMidnightBangkok();

    return {
      ...data,
      weekStartBangkok: mostRecentSunday,
      weekEndBangkok: nextSunday,
      hasHistory: data.logs_count > 0,
      most_common_mood: data.average_mood ? Math.round(data.average_mood) : 0,
    };
  } catch (error) {
    console.error("Error in getWeeklyMoodSummary:", error);
    return {
      average_mood: 0,
      logs_count: 0,
      weekStartBangkok: getMostRecentSundayMidnightBangkok(),
      weekEndBangkok: getNextSundayMidnightBangkok(),
      hasHistory: false,
      most_common_mood: 0,
    };
  }
};

export const isMoodCardVisible = () => {
  try {
    const now = new Date();
    const currentBangkokTime = convertToBangkokTime(now);
    const mostRecentSunday = getMostRecentSundayMidnightBangkok(now);

    return currentBangkokTime.getTime() >= mostRecentSunday.getTime();
  } catch (error) {
    console.error("Error checking mood card visibility:", error);
    return true;
  }
};

export const getTimeUntilNextSundayBangkok = () => {
  try {
    const now = new Date();
    const nextSunday = getNextSundayMidnightBangkok(now);
    return nextSunday.getTime() - now.getTime();
  } catch (error) {
    console.error("Error calculating time until next Sunday:", error);
    return 0;
  }
};