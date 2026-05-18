import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../store/auth';

const LOCAL_API_ORIGIN = 'http://localhost:8080';
const PRODUCTION_API_ORIGIN = 'https://apiautopsy-backend.ambitiousfield-d96653f4.centralindia.azurecontainerapps.io';
const PRODUCTION_APP_HOSTS = new Set(['apiautopsy.com', 'www.apiautopsy.com']);

export function resolveApiOrigin(configuredApiUrl?: string, hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname) {
  const normalizedConfiguredUrl = configuredApiUrl?.trim();
  if (normalizedConfiguredUrl) return normalizedConfiguredUrl;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? LOCAL_API_ORIGIN : PRODUCTION_API_ORIGIN;
}

export function isProductionAppHost(hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return PRODUCTION_APP_HOSTS.has(hostname);
}

const rawApiUrl = resolveApiOrigin(import.meta.env.VITE_API_URL);
const apiOrigin = rawApiUrl.replace(/\/+$/, '');
const baseURL = apiOrigin.endsWith('/api') ? apiOrigin : `${apiOrigin}/api`;

export const api = axios.create({
  baseURL
});

export const sameOriginApi = axios.create({
  baseURL: '/api'
});

export const backendOrigin = baseURL.replace(/\/api$/, '');

function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

api.interceptors.request.use(attachAuthToken);
sameOriginApi.interceptors.request.use(attachAuthToken);
