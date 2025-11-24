import axios from "axios";
import { tokenUtils } from "../utils/tokenUtils";

const API_URL = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to inject token automatically
api.interceptors.request.use(
  (config) => {
    const token = tokenUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Token injected:", token.substring(0, 20) + "...");
    } else {
      console.log("No token found in localStorage");
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Token expired or invalid (401), clearing storage");
      tokenUtils.clearToken();
    }
    return Promise.reject(error);
  }
);

export default api;
