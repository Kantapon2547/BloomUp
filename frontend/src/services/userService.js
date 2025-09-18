const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function getMyProfile() {
  const res = await fetch(`${API}/users/me`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function updateProfile(userData) {
  const res = await fetch(`${API}/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(userData),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/users/me/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload avatar");
  return res.json();
}
