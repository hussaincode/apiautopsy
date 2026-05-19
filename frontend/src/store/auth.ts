import { create } from 'zustand';
import { readBrowserStorage, removeBrowserStorage, writeBrowserStorage } from './browserStorage';

interface AuthState {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email?: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: readBrowserStorage('apiautopsy_token'),
  email: readBrowserStorage('apiautopsy_email'),
  setAuth: (token, email) => {
    writeBrowserStorage('apiautopsy_token', token);
    const resolvedEmail = email ?? readEmailFromJwt(token);
    if (resolvedEmail) writeBrowserStorage('apiautopsy_email', resolvedEmail);
    set({ token, email: resolvedEmail });
  },
  logout: () => {
    removeBrowserStorage('apiautopsy_token');
    removeBrowserStorage('apiautopsy_email');
    set({ token: null, email: null });
  }
}));

function readEmailFromJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.email === 'string' ? decoded.email : null;
  } catch {
    return null;
  }
}
