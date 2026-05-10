import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { normalizeEmailInput, normalizePasswordInput } from './authInput';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);

  function completeAuth(token: string, email?: string) {
    setAuth(token, email);
    window.history.replaceState({}, '', '/requests');
  }

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
    if (message.includes('Invalid verification code')) {
      return 'Invalid verification code.';
    }
    if (message.includes('Verification code expired')) {
      return 'Verification code expired. Please register again.';
    }
    if (message.includes('Too many attempts')) {
      return 'Too many attempts. Please register again.';
    }
    if (message.includes('Could not send verification email')) {
      return 'Could not send verification email. Please try again.';
    }
    return 'Authentication failed. Please check your details and try again.';
  }

  async function submit() {
    if (submitting) return;
    setError('');
    setNotice('');
    const normalizedEmail = normalizeEmailInput(email);
    const normalizedPassword = normalizePasswordInput(password);
    if (mode === 'register' && pendingEmail) {
      if (!otp.trim()) {
        setError('Please enter the verification code.');
        return;
      }
      setSubmitting(true);
      try {
        const { data } = await api.post('/auth/register/verify', { email: pendingEmail.trim().toLowerCase(), otp });
        completeAuth(data.token, data.email);
      } catch (e: any) {
        setError(authErrorMessage(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!normalizedPassword) {
      setError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email: normalizedEmail, password: normalizedPassword } : { email: normalizedEmail, password: normalizedPassword, name: name.trim() };
      const { data } = await api.post(path, payload);
      if (mode === 'register') {
        setPendingEmail(data.email);
        setOtp('');
        setNotice(data.message ?? 'Verification code sent to your email.');
      } else {
        completeAuth(data.token, data.email);
      }
    } catch (e: any) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6">
        <section className="grid w-full gap-10 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col justify-center">
            <img className="mb-6 h-14 w-14 rounded-2xl shadow-xl shadow-teal-950/30" src="/logo-mark.svg" alt="APIAutopsy" />
            <h1 className="max-w-2xl text-5xl font-semibold tracking-normal text-white">APIAutopsy</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Build, test, schedule, and monitor APIs from one secure multi-tenant workspace.</p>
          </div>
          <form className="rounded-lg border border-line bg-panel p-6 shadow-2xl" autoComplete={mode === 'login' ? 'on' : 'off'} noValidate onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <div className="mb-6 grid grid-cols-2 rounded-md bg-slate-950 p-1">
              <button type="button" disabled={submitting} className={`rounded px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 ${mode === 'login' ? 'bg-brand text-ink' : 'text-slate-300'}`} onClick={() => { setMode('login'); setPendingEmail(''); setNotice(''); setError(''); }}>Login</button>
              <button type="button" disabled={submitting} className={`rounded px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60 ${mode === 'register' ? 'bg-brand text-ink' : 'text-slate-300'}`} onClick={() => { setMode('register'); setNotice(''); setError(''); }}>Register</button>
            </div>
            {mode === 'register' && pendingEmail ? (
              <>
                <p className="mb-3 rounded-md border border-teal-500/30 bg-teal-500/10 px-3 py-3 text-sm leading-6 text-teal-100">We sent a 6-digit verification code to <span className="font-semibold">{pendingEmail}</span>.</p>
                <input inputMode="numeric" maxLength={6} autoComplete="one-time-code" disabled={submitting} className="mb-4 w-full rounded-md border border-line bg-slate-950 px-3 py-3 text-center text-xl tracking-[0.35em] disabled:cursor-not-allowed disabled:opacity-60" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                <button type="button" className="mb-3 text-sm font-semibold text-slate-300 hover:text-white" disabled={submitting} onClick={() => { setPendingEmail(''); setOtp(''); setNotice(''); setError(''); }}>Use a different email</button>
              </>
            ) : (
              <>
                {mode === 'register' && <input id="name" name="name" autoComplete="name" disabled={submitting} className="mb-3 w-full rounded-md border border-line bg-slate-950 px-3 py-3 disabled:cursor-not-allowed disabled:opacity-60" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />}
                <input id="email" name="email" autoCapitalize="none" autoComplete="username email" autoCorrect="off" spellCheck={false} inputMode="email" type="email" disabled={submitting} className="mb-3 w-full rounded-md border border-line bg-slate-950 px-3 py-3 disabled:cursor-not-allowed disabled:opacity-60" value={email} onBlur={() => setEmail(normalizeEmailInput)} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                <input id="password" name="password" autoCapitalize="none" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} autoCorrect="off" spellCheck={false} disabled={submitting} className="mb-4 w-full rounded-md border border-line bg-slate-950 px-3 py-3 disabled:cursor-not-allowed disabled:opacity-60" value={password} onBlur={() => setPassword(normalizePasswordInput)} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
              </>
            )}
            {notice && <p className="mb-3 text-sm text-teal-200">{notice}</p>}
            {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 font-semibold text-ink transition disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              {submitting ? (mode === 'login' ? 'Signing in...' : pendingEmail ? 'Verifying...' : 'Sending code...') : (mode === 'login' ? 'Sign in' : pendingEmail ? 'Verify and create account' : 'Send verification code')}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
