import { create } from 'zustand';

interface AuthState {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email?: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('apiautopsy_token'),
  email: localStorage.getItem('apiautopsy_email'),
  setAuth: (token, email) => {
    localStorage.setItem('apiautopsy_token', token);
    const resolvedEmail = email ?? readEmailFromJwt(token);
    if (resolvedEmail) localStorage.setItem('apiautopsy_email', resolvedEmail);
    set({ token, email: resolvedEmail });
  },
  logout: () => {
    localStorage.removeItem('apiautopsy_token');
    localStorage.removeItem('apiautopsy_email');
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
