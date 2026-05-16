import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';

interface Preview {
  clientId: string;
  name: string;
  scopes: string[];
  redirectUri: string;
}

export function OAuthAuthorizePage() {
  const token = useAuth((state) => state.token);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const params = useMemo(() => new URL(window.location.href).searchParams, []);

  useEffect(() => {
    if (!token) {
      window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const clientId = params.get('client_id');
    const redirectUri = params.get('redirect_uri');
    if (!clientId || !redirectUri || params.get('response_type') !== 'code') {
      setError('Invalid OAuth request. Missing client, redirect URI, or response type.');
      setLoading(false);
      return;
    }
    api.get<Preview>('/oauth/authorize/preview', {
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: params.get('scope') ?? undefined
      }
    }).then(({ data }) => setPreview(data))
      .catch(() => setError('This OAuth client or redirect URI is not allowed.'))
      .finally(() => setLoading(false));
  }, [params, token]);

  async function approve() {
    if (!preview) return;
    setApproving(true);
    setError('');
    try {
      const { data } = await api.post<{ redirectUri: string }>('/oauth/authorize', {
        clientId: params.get('client_id'),
        redirectUri: params.get('redirect_uri'),
        scope: params.get('scope'),
        state: params.get('state'),
        codeChallenge: params.get('code_challenge'),
        codeChallengeMethod: params.get('code_challenge_method')
      });
      window.location.assign(data.redirectUri);
    } catch {
      setError('Could not approve this connector. Please try again.');
      setApproving(false);
    }
  }

  function deny() {
    const redirectUri = params.get('redirect_uri');
    if (!redirectUri) {
      window.location.assign('/requests');
      return;
    }
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'access_denied');
    const state = params.get('state');
    if (state) url.searchParams.set('state', state);
    window.location.assign(url.toString());
  }

  return (
    <main className="min-h-screen bg-ink px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <img className="h-12 w-12 rounded-2xl" src="/logo-mark.svg" alt="APIAutopsy" />
          <div>
            <h1 className="text-2xl font-semibold">Connect APIAutopsy</h1>
            <p className="text-sm text-slate-400">Review access before connecting an external app.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl shadow-black/30">
          {loading && <div className="flex items-center gap-3 text-slate-300"><Loader2 className="animate-spin" />Loading authorization request...</div>}
          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-200">{error}</div>}
          {!loading && preview && (
            <>
              <div className="mb-6 flex items-start gap-4">
                <div className="rounded-2xl bg-teal-400/10 p-3 text-teal-200"><ShieldCheck size={28} /></div>
                <div>
                  <h2 className="text-xl font-semibold">{preview.name} wants to access your APIAutopsy account</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Only approve this if you trust the app and recognize the redirect destination.</p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Redirect URI</div>
                <div className="break-all font-mono text-sm text-slate-200">{preview.redirectUri}</div>
              </div>

              <div className="mb-6">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Requested permissions</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {preview.scopes.map((scope) => (
                    <div key={scope} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                      <CheckCircle2 size={16} className="text-teal-300" />{scope}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-900" disabled={approving} onClick={deny}>
                  <XCircle size={18} />Deny
                </button>
                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60" disabled={approving} onClick={approve}>
                  {approving ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}Approve access
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
