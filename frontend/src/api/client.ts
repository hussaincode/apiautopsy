import axios from 'axios';
import { useAuth } from '../store/auth';

const LOCAL_API_ORIGIN = 'http://localhost:8080';
const PRODUCTION_API_ORIGIN = 'https://apiautopsy-backend.ambitiousfield-d96653f4.centralindia.azurecontainerapps.io';

export function resolveApiOrigin(configuredApiUrl?: string, hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname) {
  if (hostname === 'apiautopsy.com' || hostname === 'www.apiautopsy.com') return '';
  const normalizedConfiguredUrl = configuredApiUrl?.trim();
  if (normalizedConfiguredUrl) return normalizedConfiguredUrl;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? LOCAL_API_ORIGIN : PRODUCTION_API_ORIGIN;
}

const rawApiUrl = resolveApiOrigin(import.meta.env.VITE_API_URL);
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
