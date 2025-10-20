const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Public endpoint

// Get all available achievements
export async function getAllAchievements() {
  const res = await fetch(`${API}/achievements`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}

// Get a specific achievement by ID
export async function getAchievement(achievementId) {
  const res = await fetch(`${API}/achievements/${achievementId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch achievement");
  return res.json();
}

// Get achievement by key name
export async function getAchievementByKey(keyName) {
  const res = await fetch(`${API}/achievements/by-key/${keyName}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch achievement");
  return res.json();
}

// user achievement endpoint

// Get all user achievements with progress
export async function getUserAchievements() {
  const res = await fetch(`${API}/achievements/user/all`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user achievements");
  return res.json();
}

// Get only earned achievements for current user
export async function getEarnedAchievements() {
  const res = await fetch(`${API}/achievements/user/earned`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch earned achievements");
  return res.json();
}

// Update achievement progress
export async function updateAchievementProgress(
  achievementId,
  progress,
  progressUnitValue = 0
) {
  const res = await fetch(
    `${API}/achievements/user/${achievementId}/progress?progress=${progress}&progress_unit_value=${progressUnitValue}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }
  );
  if (!res.ok) throw new Error("Failed to update achievement progress");
  return res.json();
}

// Earn an achievement
export async function earnAchievement(achievementId) {
  const res = await fetch(`${API}/achievements/user/${achievementId}/earn`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to earn achievement");
  return res.json();
}
