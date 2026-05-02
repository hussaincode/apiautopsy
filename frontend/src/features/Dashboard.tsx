import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Copy, FileCode2, Plus, Search, Settings, UserPlus } from 'lucide-react';
import { Button, EmptyState, Input } from '../components/ui';
import {
  useCollections,
  useCreateCollection,
  useCreateRequest,
  useCreateSchedule,
  useExecute,
  useExecutions,
  useInviteUser,
  useRequests,
  useSchedules,
  useUpdateRequest,
  useUpdateSchedule,
  useWorkspaces
} from '../api/hooks';
import { useAuth } from '../store/auth';
import type { ApiRequest, Collection, Execution, Schedule } from '../types/domain';
import { RequestBuilder } from './RequestBuilder';
import { RequestTabs } from './RequestTabs';
import { ResponseViewer } from './ResponseViewer';
import { SchedulerPage } from './SchedulerPage';
import { SettingsPage } from './SettingsPage';
import { Sidebar } from './Sidebar';
import type { AppPage, BuilderTab, RequestDraft } from './dashboardTypes';
import { emptyRequestDraft } from './dashboardTypes';

export function Dashboard() {
  const logout = useAuth((state) => state.logout);
  const email = useAuth((state) => state.email);
  const [activePage, setActivePage] = useState<AppPage>('requests');
  const [activeWorkspace, setActiveWorkspace] = useState<string>();
  const [builderTab, setBuilderTab] = useState<BuilderTab>('params');
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [toast, setToast] = useState('');
  const [liveExecution, setLiveExecution] = useState<Execution | undefined>();
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string>();
  const [draft, setDraft] = useState<RequestDraft>(emptyRequestDraft());

  const workspaces = useWorkspaces();
  const workspaceId = activeWorkspace ?? workspaces.data?.[0]?.id;
  const collections = useCollections(workspaceId);
  const requests = useRequests(workspaceId);
  const schedules = useSchedules(workspaceId);
  const executions = useExecutions(workspaceId);
  const createCollection = useCreateCollection(workspaceId);
  const createRequest = useCreateRequest(workspaceId);
  const updateRequest = useUpdateRequest(workspaceId);
  const createScheduleMutation = useCreateSchedule(workspaceId);
  const updateSchedule = useUpdateSchedule(workspaceId);
  const execute = useExecute(workspaceId);
  const inviteUser = useInviteUser(workspaceId);

  const requestList = requests.data ?? [];
  const collectionList = collections.data ?? [];
  const selectedRequest = requestList.find((request) => request.id === selectedRequestId);
  const lastExecution = liveExecution ?? executions.data?.find((execution) => execution.apiRequestId === selectedRequestId);

  const visibleRequests = useMemo(() => requestList.filter((request) => {
    const matchesSearch = `${request.name} ${request.url}`.toLowerCase().includes(search.toLowerCase());
    const matchesCollection = selectedCollectionId === 'all' || request.collectionId === selectedCollectionId;
    return matchesSearch && matchesCollection;
  }), [requestList, search, selectedCollectionId]);

  useEffect(() => {
    if (!selectedRequest) return;
    setDraft(fromRequest(selectedRequest));
  }, [selectedRequest?.id]);

  useEffect(() => {
    if (selectedRequestId || visibleRequests.length === 0) return;
    openRequest(visibleRequests[0].id);
  }, [visibleRequests.length, selectedRequestId]);

  function parseJson(value: string) {
    try {
      return JSON.parse(value || '{}');
    } catch {
      return {};
    }
  }

  function toPayload() {
    const auth = buildAuthPayload(draft);
    const headers = normalizeHeaders(parseJson(draft.headers), draft);
    return {
      collectionId: draft.collectionId || undefined,
      name: draft.name.trim() || 'Untitled Request',
      method: draft.method,
      url: draft.url.trim(),
      headers,
      queryParams: parseJson(draft.params),
      bodyType: resolveBodyType(draft),
      body: resolveBody(draft, parseJson),
      authType: draft.authType,
      auth
    };
  }

  async function saveRequest() {
    const payload = toPayload();
    const saved = draft.id
      ? await updateRequest.mutateAsync({ id: draft.id, payload })
      : await createRequest.mutateAsync(payload);
    openRequest(saved.id);
    setDraft(fromRequest(saved));
    return saved as ApiRequest;
  }

  async function sendRequest() {
    setLiveExecution(undefined);
    const saved = await saveRequest();
    const result = await execute.mutateAsync(saved.id);
    setLiveExecution(result);
  }

  async function createCollectionFromModal() {
    if (!collectionName.trim()) return;
    const collection = await createCollection.mutateAsync({ name: collectionName.trim() });
    setCollectionName('');
    setCollectionModalOpen(false);
    setSelectedCollectionId(collection.id);
    setDraft((current) => ({ ...current, collectionId: collection.id }));
  }

  async function inviteWorkspaceUser() {
    if (!inviteEmail.trim()) return;
    await inviteUser.mutateAsync({ email: inviteEmail.trim(), role: 'MEMBER' });
    setInviteEmail('');
    setInviteModalOpen(false);
    setToast('Invite created');
  }

  async function importCollection(file: File) {
    const raw = await file.text();
    const payload = JSON.parse(raw);
    const importedCollections = Array.isArray(payload.collections) ? payload.collections : [];
    for (const item of importedCollections) {
      const collection = await createCollection.mutateAsync({ name: item.name ?? 'Imported Collection', description: item.description });
      const importedRequests = Array.isArray(item.requests) ? item.requests : [];
      for (const request of importedRequests) {
        await createRequest.mutateAsync({
          collectionId: collection.id,
          name: request.name ?? 'Imported Request',
          method: request.method ?? 'GET',
          url: request.url,
          headers: request.headers ?? {},
          queryParams: request.queryParams ?? {},
          bodyType: request.bodyType ?? 'NONE',
          body: request.body ?? {},
          authType: request.authType ?? 'NONE'
        });
      }
    }
    setToast('Import complete');
  }

  function newRequest() {
    const collectionId = selectedCollectionId === 'all' ? '' : selectedCollectionId;
    setSelectedRequestId(undefined);
    setLiveExecution(undefined);
    setDraft(emptyRequestDraft(collectionId));
    setActivePage('requests');
  }

  function openRequest(id: string) {
    setSelectedRequestId(id);
    setLiveExecution(undefined);
    setOpenTabIds((current) => current.includes(id) ? current : [...current, id]);
    setActivePage('requests');
  }

  function closeTab(id: string) {
    setOpenTabIds((current) => current.filter((item) => item !== id));
    if (selectedRequestId === id) {
      const next = openTabIds.find((item) => item !== id);
      setSelectedRequestId(next);
    }
  }

  function createSchedule(payload: { apiRequestId: string; name: string; scheduleType: Schedule['scheduleType']; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) {
    createScheduleMutation.mutate(payload);
  }

  async function toggleSchedule(schedule: Schedule) {
    await updateSchedule.mutateAsync({
      id: schedule.id,
      payload: {
        apiRequestId: schedule.apiRequestId,
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        intervalMinutes: schedule.intervalMinutes,
        cronExpression: schedule.cronExpression,
        enabled: !schedule.enabled
      }
    });
  }

  return (
    <main className="h-screen overflow-hidden bg-white text-[#222]">
      <TopBar email={email} onInvite={() => setInviteModalOpen(true)} onSettings={() => setActivePage('settings')} />
      <div className="flex">
      <Sidebar
        activePage={activePage}
        collections={collectionList}
        requests={requestList}
        search={search}
        selectedCollectionId={selectedCollectionId}
        selectedRequestId={selectedRequestId}
        userEmail={email}
        workspaceId={workspaceId}
        workspaces={workspaces.data ?? []}
        onCreateCollection={() => setCollectionModalOpen(true)}
        onImport={importCollection}
        onLogout={logout}
        onNewRequest={newRequest}
        onPage={setActivePage}
        onSearch={setSearch}
        onSelectCollection={setSelectedCollectionId}
        onSelectRequest={openRequest}
        onWorkspace={setActiveWorkspace}
      />

      <section className="min-w-0 flex-1">
        {activePage === 'requests' && (
          <div className="h-[calc(100vh-48px)] bg-white">
            <section className="min-w-0 overflow-auto">
              <RequestTabs openIds={openTabIds} requests={requestList} selectedId={selectedRequestId} onClose={closeTab} onSelect={openRequest} />
              {draft ? (
                <>
                  <RequestHeader
                    collection={collectionList.find((collection) => collection.id === draft.collectionId)}
                    draft={draft}
                    onCopy={() => {
                      navigator.clipboard?.writeText(draft.url);
                      setToast('Request URL copied');
                    }}
                    onSave={saveRequest}
                  />
                  <RequestBuilder
                    activeTab={builderTab}
                    collections={collectionList}
                    draft={draft}
                    isSending={execute.isPending || createRequest.isPending || updateRequest.isPending}
                    onDraft={setDraft}
                    onSave={saveRequest}
                    onSend={sendRequest}
                    onTab={setBuilderTab}
                  />
                  <ResponseViewer execution={lastExecution} isLoading={execute.isPending} />
                </>
              ) : (
                <div className="p-6"><EmptyState title="Start with a request" body="Create a new request or choose one from a collection in the sidebar." /></div>
              )}
            </section>
          </div>
        )}

        {activePage === 'scheduler' && (
          <SchedulerPage
            executions={executions.data ?? []}
            isCreating={createScheduleMutation.isPending}
            requests={requestList}
            schedules={schedules.data ?? []}
            onCreateSchedule={createSchedule}
            onToggleSchedule={toggleSchedule}
          />
        )}

        {activePage === 'settings' && <SettingsPage workspaceId={workspaceId} />}
        {activePage === 'flows' && <FlowsPage requests={requestList} onRun={(id) => execute.mutate(id)} />}
      </section>
      </div>

      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-[#dcdcdc] bg-white p-5 shadow-2xl">
            <div className="mb-4 font-semibold text-[#222]">Create collection</div>
            <Input className="mb-4 w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb]" autoFocus placeholder="Payments API" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCollectionModalOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={createCollection.isPending} onClick={createCollectionFromModal}><Plus size={16} />Create</Button>
            </div>
          </div>
        </div>
      )}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-[#dcdcdc] bg-white p-5 shadow-2xl">
            <div className="mb-4 font-semibold text-[#222]">Invite teammate</div>
            <Input className="mb-4 w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb]" autoFocus placeholder="teammate@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setInviteModalOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={inviteUser.isPending} onClick={inviteWorkspaceUser}><UserPlus size={16} />Invite</Button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-5 right-5 rounded bg-[#111827] px-4 py-3 text-sm text-white shadow-lg" onAnimationEnd={() => setToast('')}>{toast}</div>}
    </main>
  );
}

function TopBar({ email, onInvite, onSettings }: { email?: string | null; onInvite: () => void; onSettings: () => void }) {
  return (
    <header className="flex h-12 items-center border-b border-[#e6e6e6] bg-white px-3 text-[#333]">
      <div className="mr-4 flex items-center gap-2 text-[#aaa]">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
      <nav className="flex items-center gap-7 text-[15px]">
        <button className="font-medium">Home</button>
        <button className="flex items-center gap-1 font-medium">Workspaces <ChevronDown size={15} /></button>
        <button className="font-medium">API Network</button>
      </nav>
      <div className="mx-auto w-full max-w-md px-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-[#999]" size={16} />
          <input className="h-9 w-full rounded border border-[#dedede] bg-[#fafafa] pl-9 pr-16 text-sm outline-none placeholder:text-[#999] focus:border-[#2563eb]" placeholder="Search APIAutopsy" />
          <span className="absolute right-3 top-2 rounded bg-white px-1.5 text-xs text-[#aaa]">⌘ K</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="flex h-8 items-center gap-1 rounded bg-[#2563eb] px-3 text-sm font-semibold text-white" onClick={onInvite}><UserPlus size={15} />Invite</button>
        <button className="text-[#777] hover:text-[#333]" onClick={onSettings}><Settings size={19} /></button>
        <button className="text-[#777] hover:text-[#333]"><Bell size={18} /></button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f766e] text-sm font-bold text-white">{(email ?? 'U').slice(0, 1).toUpperCase()}</div>
      </div>
    </header>
  );
}

function RequestHeader({ collection, draft, onCopy, onSave }: { collection?: Collection; draft: RequestDraft; onCopy: () => void; onSave: () => void }) {
  return (
    <div className="flex h-[74px] items-center justify-between border-b border-[#e6e6e6] bg-white px-6">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2 text-sm text-[#777]">
          <FileCode2 size={18} className="text-[#0f766e]" />
          <span>APIAutopsy</span>
          <span>/</span>
          <span>{collection?.name ?? 'Unfiled'}</span>
        </div>
        <div className="truncate text-lg font-semibold text-[#222]">{draft.name}</div>
      </div>
      <div className="flex items-center gap-2">
        <select className="h-10 rounded border border-[#dedede] bg-[#fafafa] px-3 text-sm text-[#555]">
          <option>No environment</option>
          <option>Local</option>
          <option>Staging</option>
          <option>Production</option>
        </select>
        <button className="h-10 rounded border border-[#dcdcdc] px-3 text-sm font-semibold text-[#555] hover:bg-[#f5f5f5]" onClick={onSave}>Save</button>
        <button className="flex h-10 items-center gap-2 rounded border border-[#dcdcdc] px-3 text-sm font-semibold text-[#555] hover:bg-[#f5f5f5]" onClick={onCopy}>Share <Copy size={15} /></button>
      </div>
    </div>
  );
}

function FlowsPage({ requests, onRun }: { requests: ApiRequest[]; onRun: (id: string) => void }) {
  return (
    <div className="h-[calc(100vh-48px)] bg-white p-8 text-[#222]">
      <h1 className="text-xl font-semibold">Flows</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777]">Run saved API requests as the first step toward visual API workflows.</p>
      <div className="mt-8 max-w-4xl rounded border border-[#e6e6e6]">
        {requests.slice(0, 12).map((request) => (
          <div key={request.id} className="flex items-center justify-between border-b border-[#eeeeee] px-4 py-3 last:border-b-0">
            <div>
              <div className="font-semibold">{request.name}</div>
              <div className="text-xs text-[#777]">{request.method} {request.url}</div>
            </div>
            <button className="rounded bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white" onClick={() => onRun(request.id)}>Run</button>
          </div>
        ))}
        {requests.length === 0 && <div className="p-5 text-sm text-[#777]">Save a request first, then run it from Flows.</div>}
      </div>
    </div>
  );
}

function fromRequest(request: ApiRequest): RequestDraft {
  const inferredMode = inferBodyMode(request);
  return {
    ...emptyRequestDraft(request.collectionId ?? ''),
    id: request.id,
    collectionId: request.collectionId ?? '',
    name: request.name,
    method: request.method,
    url: request.url,
    params: JSON.stringify(request.queryParams ?? {}, null, 2),
    headers: JSON.stringify(request.headers ?? {}, null, 2),
    bodyMode: inferredMode,
    body: JSON.stringify(request.body ?? {}, null, 2),
    authType: request.authType
  };
}

function buildAuthPayload(draft: RequestDraft) {
  if (draft.authType === 'BEARER') return { token: draft.authToken };
  if (draft.authType === 'API_KEY') return { headerName: draft.apiKeyHeader, apiKey: draft.apiKeyValue };
  if (draft.authType === 'BASIC') return { username: draft.basicUsername, password: draft.basicPassword };
  return undefined;
}

function resolveBodyType(draft: RequestDraft) {
  if (draft.method === 'GET' || draft.bodyMode === 'none') return 'NONE' as const;
  if (draft.bodyMode === 'raw' && draft.rawBodyFormat === 'JSON') return 'JSON' as const;
  if (draft.bodyMode === 'form-data') return 'FORM_DATA' as const;
  return 'RAW' as const;
}

function resolveBody(draft: RequestDraft, parseJson: (value: string) => Record<string, unknown>) {
  if (draft.bodyMode === 'none') return {};
  if (draft.bodyMode === 'raw' && draft.rawBodyFormat === 'Text') return { value: draft.body };
  if (draft.bodyMode === 'binary') return { mode: 'binary', note: 'Binary upload metadata saved for this request.' };
  return parseJson(draft.body);
}

function normalizeHeaders(headers: Record<string, unknown>, draft: RequestDraft) {
  const next = { ...headers };
  if (draft.bodyMode === 'x-www-form-urlencoded') next['Content-Type'] = 'application/x-www-form-urlencoded';
  if (draft.bodyMode === 'graphql') next['Content-Type'] = 'application/json';
  if (draft.bodyMode === 'raw' && draft.rawBodyFormat === 'JSON') next['Content-Type'] = next['Content-Type'] ?? 'application/json';
  return next;
}

function inferBodyMode(request: ApiRequest) {
  const contentType = String(request.headers?.['Content-Type'] ?? request.headers?.['content-type'] ?? '').toLowerCase();
  if (request.bodyType === 'NONE') return 'none' as const;
  if (request.bodyType === 'FORM_DATA') return 'form-data' as const;
  if (contentType.includes('x-www-form-urlencoded')) return 'x-www-form-urlencoded' as const;
  return 'raw' as const;
}
