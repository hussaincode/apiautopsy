import { Check, Copy, KeyRound, LockKeyhole, PlugZap, ShieldCheck, Trash2, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { useConnectedApps, useCreateCertificate, useCreateIntegrationApiKey, useIntegrationApiKeys, useRevokeConnectedApp, useRevokeIntegrationApiKey } from '../api/hooks';
import { FieldLabel, Input } from '../components/ui';

export function SettingsPage({ workspaceId }: { workspaceId?: string }) {
  const createCertificate = useCreateCertificate(workspaceId);
  const [certificateName, setCertificateName] = useState('Production client certificate');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [apiKeyName, setApiKeyName] = useState('Claude MCP Connector');
  const [createdToken, setCreatedToken] = useState('');
  const [copied, setCopied] = useState(false);
  const integrationKeys = useIntegrationApiKeys();
  const createIntegrationKey = useCreateIntegrationApiKey();
  const revokeIntegrationKey = useRevokeIntegrationApiKey();
  const connectedApps = useConnectedApps();
  const revokeConnectedApp = useRevokeConnectedApp();

  async function saveCertificate() {
    if (!certificateName.trim() || !certificateFile) return;
    const form = new FormData();
    form.append('name', certificateName.trim());
    form.append('certificate', certificateFile);
    if (privateKeyFile) form.append('privateKey', privateKeyFile);
    await createCertificate.mutateAsync(form);
    setSavedMessage('Certificate saved securely');
  }

  async function createApiKey() {
    if (!apiKeyName.trim()) return;
    const created = await createIntegrationKey.mutateAsync({ name: apiKeyName.trim() });
    setCreatedToken(created.token);
    setCopied(false);
  }

  async function copyCreatedToken() {
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
  }

  async function revokeApiKey(keyId: string) {
    if (!window.confirm('Revoke this integration API key? Claude or MCP clients using it will stop working immediately.')) return;
    await revokeIntegrationKey.mutateAsync(keyId);
    if (createdToken) setCreatedToken('');
  }

  async function disconnectApp(tokenId: string, name: string) {
    if (!window.confirm(`Disconnect ${name}? It will lose APIAutopsy access immediately.`)) return;
    await revokeConnectedApp.mutateAsync(tokenId);
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-[#0c0c0c] p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Security, credentials, and workspace configuration stay separate from request testing.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><LockKeyhole size={18} />Security</div>
          <label className="mb-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300">
            SSL verification
            <input type="checkbox" defaultChecked />
          </label>
          <FieldLabel>Client certificate</FieldLabel>
          <Input className="mb-3 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={certificateName} onChange={(event) => setCertificateName(event.target.value)} />
          <FileUpload label="Certificate file" file={certificateFile} accept=".pem,.crt" onChange={setCertificateFile} />
          <FileUpload label="Private key file" file={privateKeyFile} accept=".pem,.key" optional onChange={setPrivateKeyFile} />
          <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50" disabled={createCertificate.isPending || !certificateFile} onClick={saveCertificate}><Upload size={16} />{createCertificate.isPending ? 'Uploading' : 'Save certificate'}</button>
          {savedMessage && <p className="mt-3 text-sm text-teal-300">{savedMessage}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck size={18} />Connected apps</div>
          <p className="mb-4 text-sm leading-6 text-slate-400">OAuth apps connected to your APIAutopsy account. Revoke access when a connector is no longer needed.</p>

          <div className="grid gap-3 lg:grid-cols-2">
            {(connectedApps.data ?? []).map((app) => {
              const revoked = Boolean(app.revokedAt);
              const expired = new Date(app.expiresAt).getTime() < Date.now();
              return (
                <div key={app.tokenId} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-100">{app.name}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${revoked ? 'bg-red-500/10 text-red-300' : expired ? 'bg-amber-400/10 text-amber-200' : 'bg-teal-400/10 text-teal-200'}`}>
                          {revoked ? 'Revoked' : expired ? 'Expired' : 'Connected'}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-xs text-slate-500">{app.clientId}</div>
                    </div>
                    {!revoked && (
                      <button className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-red-400/40 px-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10" disabled={revokeConnectedApp.isPending} onClick={() => disconnectApp(app.tokenId, app.name)}>
                        <Trash2 size={14} /> Revoke
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {app.scopes.map((scope) => <span key={scope} className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-300">{scope}</span>)}
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Connected {formatDate(app.createdAt)} · Last used {formatDate(app.lastUsedAt)} · Expires {formatDate(app.expiresAt)}
                  </div>
                </div>
              );
            })}
            {connectedApps.isLoading && <p className="text-sm text-slate-500">Loading connected apps...</p>}
            {!connectedApps.isLoading && !(connectedApps.data ?? []).length && <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">No OAuth apps connected yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><KeyRound size={18} />Integration API keys</div>
          <p className="mb-4 text-sm leading-6 text-slate-400">Create keys for Claude MCP, automation clients, or APIAutopsy integrations. Keys are stored as hashes and shown only once.</p>

          <FieldLabel>Key name</FieldLabel>
          <div className="mb-3 flex gap-2">
            <Input className="min-w-0 flex-1 rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={apiKeyName} onChange={(event) => setApiKeyName(event.target.value)} />
            <button className="h-10 shrink-0 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50" disabled={createIntegrationKey.isPending || !apiKeyName.trim()} onClick={createApiKey}>
              {createIntegrationKey.isPending ? 'Creating' : 'Create'}
            </button>
          </div>

          {createdToken && (
            <div className="mb-4 rounded-xl border border-teal-400/30 bg-teal-400/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-200"><PlugZap size={16} />Copy this key now</div>
              <p className="mb-3 text-xs leading-5 text-slate-300">Use it as <span className="font-mono text-teal-200">Authorization: Bearer</span> for hosted MCP or API integrations. It will not be shown again.</p>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2">
                <code className="min-w-0 flex-1 truncate text-xs text-slate-100">{createdToken}</code>
                <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 px-2 text-xs font-semibold text-slate-200 hover:border-teal-300" onClick={copyCreatedToken}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(integrationKeys.data ?? []).map((key) => (
              <div key={key.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">{key.name}</div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{key.keyPrefix}...</div>
                  </div>
                  {key.revokedAt ? (
                    <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300">Revoked</span>
                  ) : (
                    <button className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-400/40 px-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10" disabled={revokeIntegrationKey.isPending} onClick={() => revokeApiKey(key.id)}>
                      <Trash2 size={14} /> Revoke
                    </button>
                  )}
                </div>
                <div className="mt-2 text-xs text-slate-500">Created {formatDate(key.createdAt)}{key.lastUsedAt ? ` · Last used ${formatDate(key.lastUsedAt)}` : ''}</div>
              </div>
            ))}
            {integrationKeys.isLoading && <p className="text-sm text-slate-500">Loading integration keys...</p>}
            {!integrationKeys.isLoading && !(integrationKeys.data ?? []).length && <p className="rounded-xl border border-dashed border-slate-800 p-3 text-sm text-slate-500">No integration keys yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><Users size={18} />Workspace</div>
          <FieldLabel>Workspace name</FieldLabel>
          <Input className="mb-3 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" defaultValue="APIAutopsy Founder's Workspace" />
          <p className="text-sm leading-6 text-slate-400">Use the Invite button in the top bar to add workspace members. Invites are stored server-side.</p>
        </section>
      </div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function FileUpload({ accept, file, label, optional = false, onChange }: { accept: string; file: File | null; label: string; optional?: boolean; onChange: (file: File | null) => void }) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}{optional ? ' optional' : ''}</FieldLabel>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 transition hover:border-indigo-500">
        <span className="truncate">{file ? file.name : `Upload ${accept}`}</span>
        <Upload size={16} className="text-slate-500" />
        <input className="hidden" type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
      </label>
      {file && <button className="mt-2 text-xs font-semibold text-red-300 hover:text-red-200" onClick={() => onChange(null)}>Remove file</button>}
    </div>
  );
}
