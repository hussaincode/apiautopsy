import { beforeEach, describe, expect, it } from 'vitest';
import { useAuth } from '../auth';

function jwtWithEmail(email: string) {
  const payload = btoa(JSON.stringify({ email })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuth.getState().logout();
  });

  it('stores token and resolves email from jwt payload', () => {
    const token = jwtWithEmail('founder@apiautopsy.com');
    useAuth.getState().setAuth(token);

    expect(localStorage.getItem('apiautopsy_token')).toBe(token);
    expect(localStorage.getItem('apiautopsy_email')).toBe('founder@apiautopsy.com');
    expect(useAuth.getState().email).toBe('founder@apiautopsy.com');
  });

  it('clears credentials on logout', () => {
    useAuth.getState().setAuth('token', 'user@apiautopsy.com');
    useAuth.getState().logout();

    expect(localStorage.getItem('apiautopsy_token')).toBeNull();
    expect(localStorage.getItem('apiautopsy_email')).toBeNull();
    expect(useAuth.getState().token).toBeNull();
  });
});

