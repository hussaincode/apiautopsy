import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { isProductionAppHost, resolveApiOrigin, shouldRetrySameOrigin } from './client';

describe('resolveApiOrigin', () => {
  it('uses the configured API URL when Vite provides one', () => {
    expect(resolveApiOrigin('https://api.example.com', 'apiautopsy.com')).toBe('https://api.example.com');
  });

  it('keeps localhost as the fallback for local development', () => {
    expect(resolveApiOrigin(undefined, '127.0.0.1')).toBe('http://localhost:8080');
    expect(resolveApiOrigin('', 'localhost')).toBe('http://localhost:8080');
  });

  it('falls back to the production backend on public domains', () => {
    expect(resolveApiOrigin(undefined, 'apiautopsy.com')).toBe('https://apiautopsy-backend.ambitiousfield-d96653f4.centralindia.azurecontainerapps.io');
  });
});

describe('isProductionAppHost', () => {
  it('detects production domains that can use the same-origin API fallback', () => {
    expect(isProductionAppHost('apiautopsy.com')).toBe(true);
    expect(isProductionAppHost('www.apiautopsy.com')).toBe(true);
    expect(isProductionAppHost('127.0.0.1')).toBe(false);
  });
});

describe('shouldRetrySameOrigin', () => {
  it('retries production browser network failures through the same-origin backend route', () => {
    expect(shouldRetrySameOrigin(new AxiosError('Network Error', 'ERR_NETWORK'), 'apiautopsy.com')).toBe(true);
  });

  it('does not retry local network errors or backend responses', () => {
    const backendError = new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: {}
    });

    expect(shouldRetrySameOrigin(new AxiosError('Network Error', 'ERR_NETWORK'), '127.0.0.1')).toBe(false);
    expect(shouldRetrySameOrigin(backendError, 'apiautopsy.com')).toBe(false);
  });
});
