import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, backendOrigin } from '../api/client';
import { useAuth } from '../store/auth';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('founder@apiautopsy.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [name, setName] = useState('APIAutopsy Founder');
  const [error, setError] = useState('');
  const setAuth = useAuth((s) => s.setAuth);

  function authErrorMessage(error: any) {
    const message = String(error?.response?.data?.message ?? '');
    if (message.includes('well-formed email') || message.includes('registerRequest.email')) {
      return 'Please provide a valid email address.';
    }
    if (message.includes('Email already registered')) {
      return 'This email is already registered. Try logging in instead.';
    }
    if (message.includes('Invalid credentials')) {
      return 'Invalid email or password.';
    }
    return 'Authentication failed. Please check your details and try again.';
  }

  async function submit() {
    setError('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email, password } : { email, password, name };
      const { data } = await api.post(path, payload);
      setAuth(data.token, data.email);
    } catch (e: any) {
      setError(authErrorMessage(e));
    }
  }

  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <section className="grid w-full gap-10 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-ink">
              <ShieldCheck size={26} />
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-normal text-white">APIAutopsy</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Build, test, schedule, and monitor APIs from one secure multi-tenant workspace.</p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-6 shadow-2xl">
            <div className="mb-6 grid grid-cols-2 rounded-md bg-slate-950 p-1">
              <button className={`rounded px-3 py-2 ${mode === 'login' ? 'bg-brand text-ink' : 'text-slate-300'}`} onClick={() => setMode('login')}>Login</button>
              <button className={`rounded px-3 py-2 ${mode === 'register' ? 'bg-brand text-ink' : 'text-slate-300'}`} onClick={() => setMode('register')}>Register</button>
            </div>
            {mode === 'register' && <input className="mb-3 w-full rounded-md border border-line bg-slate-950 px-3 py-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />}
            <input className="mb-3 w-full rounded-md border border-line bg-slate-950 px-3 py-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <input className="mb-4 w-full rounded-md border border-line bg-slate-950 px-3 py-3" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
            <button className="w-full rounded-md bg-brand px-4 py-3 font-semibold text-ink" onClick={submit}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
            <a className="mt-3 block w-full rounded-md border border-line px-4 py-3 text-center text-slate-200" href={`${backendOrigin}/oauth2/authorization/google`}>Continue with Google</a>
          </div>
        </section>
      </div>
    </main>
  );
}
