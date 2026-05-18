import { describe, expect, it } from 'vitest';
import { resolveApiOrigin } from './client';

describe('resolveApiOrigin', () => {
  it('uses the configured API URL when Vite provides one', () => {
    expect(resolveApiOrigin('https://api.example.com', 'preview.apiautopsy.test')).toBe('https://api.example.com');
  });

  it('keeps localhost as the fallback for local development', () => {
    expect(resolveApiOrigin(undefined, '127.0.0.1')).toBe('http://localhost:8080');
    expect(resolveApiOrigin('', 'localhost')).toBe('http://localhost:8080');
  });

  it('uses same-origin API proxy on the production domain', () => {
    expect(resolveApiOrigin(undefined, 'apiautopsy.com')).toBe('');
    expect(resolveApiOrigin('https://ignored.example.com', 'www.apiautopsy.com')).toBe('');
  });

  it('falls back to the production backend on non-local public preview domains', () => {
    expect(resolveApiOrigin(undefined, 'apiautopsy-preview.vercel.app')).toBe('https://apiautopsy-backend.ambitiousfield-d96653f4.centralindia.azurecontainerapps.io');
  });
});
