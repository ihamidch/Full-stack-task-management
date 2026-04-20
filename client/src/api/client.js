import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getSocketUrl() {
  const custom = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
  if (custom) return custom.replace(/\/$/, '');
  // Dev: Socket.io is not proxied by Vite; default to API port. Production: same origin as the deployed API if env is unset.
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return typeof window !== 'undefined' ? window.location.origin : '';
}
