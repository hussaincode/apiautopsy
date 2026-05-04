import axios from 'axios';
import { useAuth } from '../store/auth';

const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const apiOrigin = rawApiUrl.replace(/\/+$/, '');
const baseURL = apiOrigin.endsWith('/api') ? apiOrigin : `${apiOrigin}/api`;

export const api = axios.create({
  baseURL
});

export const backendOrigin = baseURL.replace(/\/api$/, '');

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
