import axios, { type AxiosInstance } from 'axios';
import { api, isProductionAppHost, sameOriginApi } from './client';
import type { ApiRequest, Execution } from '../types/domain';

export type PublicExecutePayload = Partial<ApiRequest> & { auth?: Record<string, unknown> };

type ExecuteOptions = {
  primaryClient?: AxiosInstance;
  fallbackClient?: AxiosInstance;
  hostname?: string;
};

export function isBrowserNetworkError(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

export async function executePublicRequest(payload: PublicExecutePayload, options: ExecuteOptions = {}) {
  const primaryClient = options.primaryClient ?? api;
  const fallbackClient = options.fallbackClient ?? sameOriginApi;
  const hostname = options.hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname);

  try {
    return (await primaryClient.post<Execution>('/public/execute', payload)).data;
  } catch (error) {
    if (!isProductionAppHost(hostname) || !isBrowserNetworkError(error)) {
      throw error;
    }

    return (await fallbackClient.post<Execution>('/public/execute', payload)).data;
  }
}
