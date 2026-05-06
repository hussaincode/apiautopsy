import { KeyRound, Plus, Send, ShieldCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { FieldLabel, Input, Select } from '../components/ui';
import type { ApiRequest, Certificate, Collection, HttpMethod } from '../types/domain';
import type { BuilderTab, RawBodyFormat, RequestBodyMode, RequestDraft } from './dashboardTypes';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const builderTabs: BuilderTab[] = ['params', 'headers', 'body', 'auth', 'certificates'];

export function RequestBuilder({
  activeTab,
  collections,
  certificates,
  draft,
  isSending,
  onDraft,
  onSave,
  onSend,
  onTab
}: {
  activeTab: BuilderTab;
  collections: Collection[];
  certificates: Certificate[];
  draft: RequestDraft;
  isSending: boolean;
  onDraft: (draft: RequestDraft) => void;
  onSave: () => void;
  onSend: () => void;
  onTab: (tab: BuilderTab) => void;
}) {
  return (
    <section className="border-b border-slate-800 bg-[#0c0c0c]">
      <div className="space-y-3 p-5">
        <div className="grid gap-2 lg:grid-cols-[128px_1fr_112px]">
          <Select className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.method} onChange={(event) => onDraft({ ...draft, method: event.target.value as HttpMethod })}>
            {methods.map((method) => <option key={method}>{method}</option>)}
          </Select>
          <Input className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500" value={draft.url} onChange={(event) => onDraft({ ...draft, url: event.target.value })} placeholder="https://api.company.com/v1/users" />
          <button className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:opacity-50" disabled={isSending} onClick={onSend}><Send size={16} />{isSending ? 'Sending' : 'Send'}</button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_260px]">
          <Input className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500" value={draft.name} onChange={(event) => onDraft({ ...draft, name: event.target.value })} placeholder="Request name" />
          <Select className="rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.collectionId} onChange={(event) => onDraft({ ...draft, collectionId: event.target.value })}>
            <option value="">Unfiled</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="flex border-y border-slate-800 px-5">
        {builderTabs.map((tab) => (
          <button key={tab} onClick={() => onTab(tab)} className={`h-11 border-b-2 px-4 text-sm font-medium capitalize transition ${activeTab === tab ? 'border-indigo-400 text-slate-50' : 'border-transparent text-slate-400 hover:text-slate-100'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'params' && <KeyValueEditor title="Query parameters" helper="Add URL query parameters as key and value pairs." value={draft.params} onChange={(params) => onDraft({ ...draft, params })} />}
        {activeTab === 'headers' && <KeyValueEditor title="Headers" helper="Add request headers as key and value pairs." value={draft.headers} onChange={(headers) => onDraft({ ...draft, headers })} />}
        {activeTab === 'body' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-5 text-sm text-slate-300">
              {bodyModes.map((mode) => (
                <label key={mode.value} className="flex items-center gap-2">
                  <input type="radio" checked={draft.bodyMode === mode.value} onChange={() => onDraft({ ...draft, bodyMode: mode.value })} />
                  {mode.label}
                </label>
              ))}
              {draft.bodyMode === 'raw' && (
                <select className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-indigo-300" value={draft.rawBodyFormat} onChange={(event) => onDraft({ ...draft, rawBodyFormat: event.target.value as RawBodyFormat })}>
                  <option>JSON</option>
                  <option>Text</option>
                </select>
              )}
              {draft.bodyMode === 'raw' && draft.rawBodyFormat === 'JSON' && <button className="ml-auto text-sm font-semibold text-indigo-300 hover:text-indigo-200" onClick={() => onDraft({ ...draft, body: beautifyJson(draft.body) })}>Beautify</button>}
            </div>
            <BodyEditor draft={draft} onDraft={onDraft} />
          </>
        )}
        {activeTab === 'auth' && <AuthPanel draft={draft} onDraft={onDraft} />}
        {activeTab === 'certificates' && <CertificatesPanel certificates={certificates} draft={draft} onDraft={onDraft} />}
      </div>
    </section>
  );
}

const bodyModes: { value: RequestBodyMode; label: string }[] = [
  { value: 'none', label: 'none' },
  { value: 'form-data', label: 'form-data' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'raw', label: 'raw' },
  { value: 'binary', label: 'binary' },
  { value: 'graphql', label: 'GraphQL' }
];

function BodyEditor({ draft, onDraft }: { draft: RequestDraft; onDraft: (draft: RequestDraft) => void }) {
  if (draft.bodyMode === 'none') {
    return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center text-sm text-slate-400">No body will be sent with this request.</div>;
  }
  if (draft.bodyMode === 'binary') {
    return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center text-sm text-slate-400">Binary upload support is staged for the API client. Save metadata here and use raw/form-data for MVP calls.</div>;
  }
  if (draft.bodyMode === 'form-data') {
    return <JsonEditor title="Form data" helper={'Enter key/value JSON. Example: { "fileName": "report.pdf" }'} value={draft.body} onChange={(body) => onDraft({ ...draft, body })} />;
  }
  if (draft.bodyMode === 'x-www-form-urlencoded') {
    return <JsonEditor title="URL encoded form" helper={'Enter key/value JSON. It will be sent as application/x-www-form-urlencoded metadata. Example: { "email": "user@example.com" }'} value={draft.body} onChange={(body) => onDraft({ ...draft, body })} />;
  }
  if (draft.bodyMode === 'graphql') {
    return <JsonEditor title="GraphQL" helper={'Enter JSON with query and variables. Example: { "query": "{ viewer { login } }" }'} value={draft.body} onChange={(body) => onDraft({ ...draft, body })} />;
  }
  return <JsonEditor title="Raw body" helper={draft.rawBodyFormat === 'JSON' ? 'JSON body is sent for POST, PUT, PATCH, and DELETE requests.' : 'Plain text is stored in the body.value field for execution.'} value={draft.body} onChange={(body) => onDraft({ ...draft, body })} />;
}

function beautifyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value || '{}'), null, 2);
  } catch {
    return value;
  }
}

function JsonEditor({ title, helper, value, onChange }: { title: string; helper: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
        <p className="mt-1 text-sm text-slate-400">{helper}</p>
      </div>
      <textarea className="h-40 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

type KeyValueRow = { id: string; key: string; value: string; enabled: boolean };

function KeyValueEditor({ title, helper, value, onChange }: { title: string; helper: string; value: string; onChange: (value: string) => void }) {
  const [rows, setRows] = useState(() => jsonToRows(value));

  useEffect(() => {
    if (value !== rowsToJson(rows)) setRows(jsonToRows(value));
  }, [value]);

  function commit(nextRows: KeyValueRow[]) {
    setRows(nextRows);
    onChange(rowsToJson(nextRows));
  }

  function updateRow(id: string, patch: Partial<KeyValueRow>) {
    commit(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow() {
    commit([...rows.filter((row) => row.key || row.value), emptyKeyValueRow()]);
  }

  function removeRow(id: string) {
    const nextRows = rows.filter((row) => row.id !== id);
    commit(nextRows.length ? nextRows : [emptyKeyValueRow()]);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
          <p className="mt-1 text-sm text-slate-400">{helper}</p>
        </div>
        <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white" onClick={addRow}>
          <Plus size={15} />Add
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_48px] border-b border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div />
          <div>Key</div>
          <div>Value</div>
          <div />
        </div>
        <div className="divide-y divide-slate-800">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_48px] items-center gap-2 px-3 py-2">
              <input className="h-4 w-4 accent-indigo-500" type="checkbox" checked={row.enabled} onChange={(event) => updateRow(row.id, { enabled: event.target.checked })} aria-label={`Enable ${row.key || 'row'}`} />
              <input className="h-10 min-w-0 rounded-lg border border-slate-800 bg-[#050816] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500" placeholder="key" value={row.key} onChange={(event) => updateRow(row.id, { key: event.target.value })} />
              <input className="h-10 min-w-0 rounded-lg border border-slate-800 bg-[#050816] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500" placeholder="value" value={row.value} onChange={(event) => updateRow(row.id, { value: event.target.value })} />
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-950/40 hover:text-red-300" onClick={() => removeRow(row.id)} aria-label="Remove row">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function jsonToRows(value: string): KeyValueRow[] {
  try {
    const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
    const rows = Object.entries(parsed ?? {}).map(([key, rowValue]) => ({
      id: keyValueRowId(key),
      key,
      value: stringifyCellValue(rowValue),
      enabled: true
    }));
    return rows.length ? rows : [emptyKeyValueRow()];
  } catch {
    return [emptyKeyValueRow()];
  }
}

function rowsToJson(rows: KeyValueRow[]) {
  const data = rows.reduce<Record<string, string>>((acc, row) => {
    if (row.enabled && row.key.trim()) acc[row.key.trim()] = row.value;
    return acc;
  }, {});
  return JSON.stringify(data, null, 2);
}

function emptyKeyValueRow(): KeyValueRow {
  return { id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`, key: '', value: '', enabled: true };
}

function keyValueRowId(key: string) {
  return `row-${key}`;
}

function stringifyCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function AuthPanel({ draft, onDraft }: { draft: RequestDraft; onDraft: (draft: RequestDraft) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <div>
        <FieldLabel>Authorization type</FieldLabel>
        <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.authType} onChange={(event) => onDraft({ ...draft, authType: event.target.value as ApiRequest['authType'] })}>
          <option value="NONE">No auth</option>
          <option value="BEARER">Bearer token</option>
          <option value="API_KEY">API key</option>
          <option value="BASIC">Basic auth</option>
        </Select>
        <p className="mt-3 text-sm leading-6 text-slate-400">Sensitive auth values are encrypted before they are stored by the backend.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        {draft.authType === 'NONE' && <div className="flex items-center gap-3 text-slate-400"><ShieldCheck size={20} />This request will be sent without authentication.</div>}
        {draft.authType === 'BEARER' && <SecretInput icon={<KeyRound size={16} />} label="Bearer token" value={draft.authToken} onChange={(authToken) => onDraft({ ...draft, authToken })} />}
        {draft.authType === 'API_KEY' && (
          <div className="grid gap-3 md:grid-cols-2">
            <SecretInput label="Header name" value={draft.apiKeyHeader} onChange={(apiKeyHeader) => onDraft({ ...draft, apiKeyHeader })} />
            <SecretInput label="API key" value={draft.apiKeyValue} onChange={(apiKeyValue) => onDraft({ ...draft, apiKeyValue })} />
          </div>
        )}
        {draft.authType === 'BASIC' && (
          <div className="grid gap-3 md:grid-cols-2">
            <SecretInput label="Username" value={draft.basicUsername} onChange={(basicUsername) => onDraft({ ...draft, basicUsername })} />
            <SecretInput label="Password" type="password" value={draft.basicPassword} onChange={(basicPassword) => onDraft({ ...draft, basicPassword })} />
          </div>
        )}
      </div>
    </div>
  );
}

function SecretInput({ icon, label, type = 'text', value, onChange }: { icon?: ReactNode; label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        {icon && <span className="absolute left-3 top-3 text-slate-500">{icon}</span>}
        <Input className={`w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500 ${icon ? 'pl-9' : ''}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function CertificatesPanel({ certificates, draft, onDraft }: { certificates: Certificate[]; draft: RequestDraft; onDraft: (draft: RequestDraft) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <div>
        <FieldLabel>Client certificate</FieldLabel>
        <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.certificateId} onChange={(event) => onDraft({ ...draft, certificateId: event.target.value })}>
          <option value="">No client certificate</option>
          {certificates.map((certificate) => <option key={certificate.id} value={certificate.id}>{certificate.name}</option>)}
        </Select>
        <p className="mt-3 text-sm leading-6 text-slate-400">Upload certificates from Settings, then attach one here for mutual TLS requests.</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/70 p-5 text-sm text-slate-400">
        {certificates.length === 0 ? 'No certificates uploaded yet. Open Settings to add .pem, .crt, or .key files.' : 'The selected certificate id will be saved with this request and sent to the backend.'}
      </div>
    </div>
  );
}
