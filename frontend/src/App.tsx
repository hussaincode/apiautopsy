import { useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './features/Dashboard';
import { useAuth } from './store/auth';

export default function App() {
  const token = useAuth((s) => s.token);
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthToken = url.searchParams.get('token');
    if (oauthToken) {
      setAuth(oauthToken);
      window.history.replaceState({}, '', '/');
    }
  }, [setAuth]);

  return token ? <Dashboard /> : <AuthScreen />;
}
