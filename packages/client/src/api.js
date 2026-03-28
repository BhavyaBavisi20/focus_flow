import axios from 'axios';

// In production VITE_API_URL is set to the deployed server (e.g. https://focusflow-api.onrender.com/api)
// In dev the Vite proxy forwards /api → localhost:2001
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('focusflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
