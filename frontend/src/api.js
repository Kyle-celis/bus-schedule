import axios from "axios";

// --- CHANGE THIS when your backend tunnel URL changes ---
const BACKEND_TUNNEL = "https://your-new-backend-tunnel-url.trycloudflare.com";

// Auto-detect: if the browser is on localhost, talk to localhost.
// Otherwise, talk to the public backend tunnel.
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_URL = isLocal ? "http://localhost:8000" : BACKEND_TUNNEL;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const publicApi = axios.create({
  baseURL: API_URL,
});