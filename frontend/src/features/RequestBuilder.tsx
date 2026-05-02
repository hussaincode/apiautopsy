import { KeyRound, Send, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, FieldLabel, Input, Select } from '../components/ui';
import type { ApiRequest, Collection, HttpMethod } from '../types/domain';
import type { BuilderTab, RawBodyFormat, RequestBodyMode, RequestDraft } from './dashboardTypes';

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const builderTabs: BuilderTab[] = ['params', 'headers', 'body', 'auth'];

export function RequestBuilder({
  activeTab,
  collections,
  draft,
  isSending,
  onDraft,
  onSave,
  onSend,
  onTab
}: {
  activeTab: BuilderTab;
  collections: Collection[];
  draft: RequestDraft;
  isSending: boolean;
  onDraft: (draft: RequestDraft) => void;
  onSave: () => void;
  onSend: () => void;
  onTab: (tab: BuilderTab) => void;
}) {
  return (
    <section className="border-b border-[#e6e6e6] bg-white">
      <div className="space-y-3 p-5">
        <div className="grid gap-2 lg:grid-cols-[128px_1fr_112px]">
          <Select className="rounded border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.method} onChange={(event) => onDraft({ ...draft, method: event.target.value as HttpMethod })}>
            {methods.map((method) => <option key={method}>{method}</option>)}
          </Select>
          <Input className="rounded border-[#dcdcdc] bg-white text-[#333] placeholder:text-[#aaa] focus:border-[#2563eb]" value={draft.url} onChange={(event) => onDraft({ ...draft, url: event.target.value })} placeholder="https://api.company.com/v1/users" />
          <button className="flex h-10 items-center justify-center gap-2 rounded bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50" disabled={isSending} onClick={onSend}><Send size={16} />{isSending ? 'Sending' : 'Send'}</button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_260px]">
          <Input className="rounded border-[#dcdcdc] bg-white text-[#333] placeholder:text-[#aaa] focus:border-[#2563eb]" value={draft.name} onChange={(event) => onDraft({ ...draft, name: event.target.value })} placeholder="Request name" />
          <Select className="rounded border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.collectionId} onChange={(event) => onDraft({ ...draft, collectionId: event.target.value })}>
            <option value="">Unfiled</option>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="flex border-y border-[#e6e6e6] px-5">
        {builderTabs.map((tab) => (
          <button key={tab} onClick={() => onTab(tab)} className={`h-11 border-b-2 px-4 text-sm font-medium capitalize ${activeTab === tab ? 'border-[#2563eb] text-[#222]' : 'border-transparent text-[#777] hover:text-[#333]'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'params' && <JsonEditor title="Query parameters" helper={'Use simple JSON. Example: { "page": 1 }'} value={draft.params} onChange={(params) => onDraft({ ...draft, params })} />}
        {activeTab === 'headers' && <JsonEditor title="Headers" helper="Add request headers as JSON key/value pairs." value={draft.headers} onChange={(headers) => onDraft({ ...draft, headers })} />}
        {activeTab === 'body' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-5 text-sm text-[#555]">
              {bodyModes.map((mode) => (
                <label key={mode.value} className="flex items-center gap-2">
                  <input type="radio" checked={draft.bodyMode === mode.value} onChange={() => onDraft({ ...draft, bodyMode: mode.value })} />
                  {mode.label}
                </label>
              ))}
              {draft.bodyMode === 'raw' && (
                <select className="h-8 rounded border border-[#dcdcdc] bg-[#fafafa] px-2 text-sm text-[#2563eb]" value={draft.rawBodyFormat} onChange={(event) => onDraft({ ...draft, rawBodyFormat: event.target.value as RawBodyFormat })}>
                  <option>JSON</option>
                  <option>Text</option>
                </select>
              )}
              {draft.bodyMode === 'raw' && draft.rawBodyFormat === 'JSON' && <button className="ml-auto text-sm font-semibold text-[#2563eb]" onClick={() => onDraft({ ...draft, body: beautifyJson(draft.body) })}>Beautify</button>}
            </div>
            <BodyEditor draft={draft} onDraft={onDraft} />
          </>
        )}
        {activeTab === 'auth' && <AuthPanel draft={draft} onDraft={onDraft} />}
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
    return <div className="rounded border border-dashed border-[#d6e4ff] bg-gradient-to-br from-[#f8fbff] to-white p-8 text-center text-sm text-[#64748b]">No body will be sent with this request.</div>;
  }
  if (draft.bodyMode === 'binary') {
    return <div className="rounded border border-dashed border-[#d6e4ff] bg-gradient-to-br from-[#f8fbff] to-white p-8 text-center text-sm text-[#64748b]">Binary upload support is staged for the API client. Save metadata here and use raw/form-data for MVP calls.</div>;
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
        <div className="text-xs font-semibold uppercase text-[#999]">{title}</div>
        <p className="mt-1 text-sm text-[#777]">{helper}</p>
      </div>
      <textarea className="h-40 w-full resize-none rounded border border-[#dedede] bg-[#fbfbfb] p-4 font-mono text-sm leading-6 text-[#333] outline-none focus:border-[#2563eb]" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AuthPanel({ draft, onDraft }: { draft: RequestDraft; onDraft: (draft: RequestDraft) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <div>
        <FieldLabel>Authorization type</FieldLabel>
        <Select className="w-full border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.authType} onChange={(event) => onDraft({ ...draft, authType: event.target.value as ApiRequest['authType'] })}>
          <option value="NONE">No auth</option>
          <option value="BEARER">Bearer token</option>
          <option value="API_KEY">API key</option>
          <option value="BASIC">Basic auth</option>
        </Select>
        <p className="mt-3 text-sm leading-6 text-[#777]">Sensitive auth values are encrypted before they are stored by the backend.</p>
      </div>

      <div className="rounded border border-[#e6e6e6] bg-[#fbfbfb] p-4">
        {draft.authType === 'NONE' && <div className="flex items-center gap-3 text-[#777]"><ShieldCheck size={20} />This request will be sent without authentication.</div>}
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
        {icon && <span className="absolute left-3 top-3 text-[#999]">{icon}</span>}
        <Input className={`w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb] ${icon ? 'pl-9' : ''}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}
