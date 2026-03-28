import axios from 'axios';

// Normalize: strip trailing slash, ensure /api suffix
function buildBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) return '/api';
  const stripped = raw.replace(/\/+$/, ''); // remove trailing slashes
  return stripped.endsWith('/api') ? stripped : `${stripped}/api`;
}

const api = axios.create({ baseURL: buildBaseURL() });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('focusflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
