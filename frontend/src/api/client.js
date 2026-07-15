import axios from "axios";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
// In prod, set VITE_API_BASE_URL to your deployed backend URL.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.detail || fallback;
}

// Builds the ws:// or wss:// URL for the signaling socket for a given room.
export function signalingUrl(roomCode, token) {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws/rooms/${roomCode}?token=${encodeURIComponent(token)}`;
  }
  const base = import.meta.env.VITE_WS_BASE_URL || "";
  return `${base}/ws/rooms/${roomCode}?token=${encodeURIComponent(token)}`;
}
