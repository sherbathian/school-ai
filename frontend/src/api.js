import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: "application/json" },
});

// The auth provider registers a function here. When the API says our token
// is no longer valid, we call it so the app can log the user out.
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only react if we actually sent a token. A 401 without one is just
    // "not logged in", which the routes already handle.
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default api;
