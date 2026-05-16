import { useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './features/Dashboard';
import { OAuthAuthorizePage } from './features/OAuthAuthorizePage';
import { PublicStatusPage } from './features/PublicStatusPage';
import { useAuth } from './store/auth';

export default function App() {
  const token = useAuth((s) => s.token);
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthToken = url.searchParams.get('token');
    if (oauthToken) {
      setAuth(oauthToken);
      window.history.replaceState({}, '', '/requests');
    }
  }, [setAuth]);

  const statusMatch = window.location.pathname.match(/^\/status\/([a-z0-9-]+)$/);
  if (statusMatch) return <PublicStatusPage slug={statusMatch[1]} />;

  if (window.location.pathname === '/oauth/authorize') return <OAuthAuthorizePage />;

  if (window.location.pathname === '/login') return token ? <Dashboard /> : <AuthScreen />;

  return <Dashboard />;
}
