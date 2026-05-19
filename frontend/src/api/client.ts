import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../store/auth';

const LOCAL_API_ORIGIN = 'http://localhost:8080';
const PRODUCTION_API_ORIGIN = 'https://apiautopsy-backend.ambitiousfield-d96653f4.centralindia.azurecontainerapps.io';
const PRODUCTION_APP_HOSTS = new Set(['apiautopsy.com', 'www.apiautopsy.com']);

function withApiPath(origin: string) {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  return normalizedOrigin.endsWith('/api') ? normalizedOrigin : `${normalizedOrigin}/api`;
}

export function resolveBackendOrigin(configuredApiUrl?: string, hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname) {
  const normalizedConfiguredUrl = configuredApiUrl?.trim();
  if (normalizedConfiguredUrl) return normalizedConfiguredUrl;
  return hostname === 'localhost' || hostname === '127.0.0.1' ? LOCAL_API_ORIGIN : PRODUCTION_API_ORIGIN;
}

export function resolveApiBaseUrl(configuredApiUrl?: string, hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname) {
  if (isProductionAppHost(hostname)) return '/api';
  return withApiPath(resolveBackendOrigin(configuredApiUrl, hostname));
}

export function resolveApiOrigin(configuredApiUrl?: string, hostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname) {
  return resolveBackendOrigin(configuredApiUrl, hostname);
}

export function isProductionAppHost(hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return PRODUCTION_APP_HOSTS.has(hostname);
}

export function shouldRetrySameOrigin(error: unknown, hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  return axios.isAxiosError(error) && !error.response && isProductionAppHost(hostname);
}

const baseURL = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
const directBackendBaseURL = withApiPath(resolveBackendOrigin(import.meta.env.VITE_API_URL));

export const api = axios.create({
  baseURL
});

export const sameOriginApi = axios.create({
  baseURL: '/api'
});

export const backendOrigin = directBackendBaseURL.replace(/\/api$/, '');

function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

api.interceptors.request.use(attachAuthToken);
sameOriginApi.interceptors.request.use(attachAuthToken);
