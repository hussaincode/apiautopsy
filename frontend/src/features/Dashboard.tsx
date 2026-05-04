import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Copy, FileCode2, Plus, Search, Settings, UserPlus } from 'lucide-react';
import { Button, EmptyState, FieldLabel, Input } from '../components/ui';
import {
  useCollections,
  useCertificates,
  useCreateCollection,
  useCreateRequest,
  useCreateSchedule,
  useDeleteSchedule,
  useExecute,
  useExecutions,
  useInviteUser,
  useRequests,
  useSchedules,
  useUpdateRequest,
  useUpdateSchedule,
  useWorkspaces,
  useRunWorkflow,
  useSaveWorkflowSteps,
  useWorkflowRuns,
  useWorkflowSteps
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
  const [profileOpen, setProfileOpen] = useState(false);
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
  const certificates = useCertificates(workspaceId);
  const createCollection = useCreateCollection(workspaceId);
  const createRequest = useCreateRequest(workspaceId);
  const updateRequest = useUpdateRequest(workspaceId);
  const createScheduleMutation = useCreateSchedule(workspaceId);
  const updateSchedule = useUpdateSchedule(workspaceId);
  const deleteSchedule = useDeleteSchedule(workspaceId);
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
      certificateId: draft.certificateId || undefined,
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

  async function newRequest() {
    const collectionId = selectedCollectionId === 'all' ? '' : selectedCollectionId;
    setLiveExecution(undefined);
    setActivePage('requests');
    const payload = {
      ...toPayloadFromDraft(emptyRequestDraft(collectionId), parseJson),
      name: `New Request ${requestList.length + 1}`
    };
    const saved = await createRequest.mutateAsync(payload);
    openRequest(saved.id);
    setDraft(fromRequest(saved as ApiRequest));
    setToast('New request created');
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

  function createSchedule(payload: { apiRequestId?: string; collectionId?: string; targetType?: Schedule['targetType']; name: string; scheduleType: Schedule['scheduleType']; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) {
    createScheduleMutation.mutate(payload);
  }

  async function saveSchedule(scheduleId: string | undefined, payload: { apiRequestId?: string; collectionId?: string; targetType?: Schedule['targetType']; name: string; scheduleType: Schedule['scheduleType']; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) {
    if (scheduleId) await updateSchedule.mutateAsync({ id: scheduleId, payload });
    else await createScheduleMutation.mutateAsync(payload);
  }

  async function removeSchedule(schedule: Schedule) {
    await deleteSchedule.mutateAsync(schedule.id);
    setToast('Schedule deleted');
  }

  async function toggleSchedule(schedule: Schedule) {
    await updateSchedule.mutateAsync({
      id: schedule.id,
        payload: {
        apiRequestId: schedule.apiRequestId,
        collectionId: schedule.collectionId,
        targetType: schedule.targetType,
        name: schedule.name,
        scheduleType: schedule.scheduleType,
        intervalMinutes: schedule.intervalMinutes,
        cronExpression: schedule.cronExpression,
        enabled: !schedule.enabled
      }
    });
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0c0c0c] text-slate-100">
      <TopBar email={email} profileOpen={profileOpen} onInvite={() => setInviteModalOpen(true)} onLogout={logout} onProfile={() => setProfileOpen((open) => !open)} onSettings={() => setActivePage('settings')} />
      <div className="flex h-[calc(100vh-48px)] min-h-0">
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

      <section className="min-h-0 min-w-0 flex-1">
        {activePage === 'requests' && (
          <div className="flex h-full min-h-0 flex-col bg-[#0c0c0c]">
            <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              <RequestTabs openIds={openTabIds} requests={requestList} selectedId={selectedRequestId} onClose={closeTab} onNew={newRequest} onSelect={openRequest} />
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
                    certificates={certificates.data ?? []}
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
            collections={collectionList}
            requests={requestList}
            schedules={schedules.data ?? []}
            onCreateSchedule={createSchedule}
            onDeleteSchedule={removeSchedule}
            onSaveSchedule={saveSchedule}
            onToggleSchedule={toggleSchedule}
            workspaceId={workspaceId}
          />
        )}

        {activePage === 'settings' && <SettingsPage workspaceId={workspaceId} />}
        {activePage === 'flows' && <FlowsPage collections={collectionList} requests={requestList} workspaceId={workspaceId} />}
      </section>
      </div>

      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-2xl">
            <div className="mb-4 font-semibold text-slate-100">Create collection</div>
            <Input className="mb-4 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" autoFocus placeholder="Payments API" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCollectionModalOpen(false)}>Cancel</Button>
              <Button variant="primary" disabled={createCollection.isPending} onClick={createCollectionFromModal}><Plus size={16} />Create</Button>
            </div>
          </div>
        </div>
      )}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-2xl">
            <div className="mb-4 font-semibold text-slate-100">Invite teammate</div>
            <Input className="mb-4 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" autoFocus placeholder="teammate@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
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

function TopBar({ email, profileOpen, onInvite, onLogout, onProfile, onSettings }: { email?: string | null; profileOpen: boolean; onInvite: () => void; onLogout: () => void; onProfile: () => void; onSettings: () => void }) {
  const displayEmail = email ?? 'user@apiautopsy.com';
  const displayName = displayEmail.split('@')[0].replace(/[._-]+/g, ' ');
  return (
    <header className="flex h-12 min-w-0 items-center border-b border-slate-800 bg-[#111827] px-3 text-slate-100 shadow-lg shadow-black/20">
      <div className="mr-4 hidden shrink-0 items-center gap-2 text-slate-500 sm:flex">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
      <nav className="hidden shrink-0 items-center gap-5 text-[15px] xl:flex">
        <button className="font-medium">Home</button>
        <button className="flex items-center gap-1 font-medium">Workspaces <ChevronDown size={15} /></button>
        <button className="font-medium">API Network</button>
      </nav>
      <div className="mx-auto hidden w-full max-w-md px-4 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-16 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-500" placeholder="Search APIAutopsy" />
          <span className="absolute right-3 top-2 rounded bg-slate-900 px-1.5 text-xs text-slate-500">⌘ K</span>
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button className="hidden h-8 items-center gap-1 rounded-xl bg-indigo-500 px-3 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:flex" onClick={onInvite}><UserPlus size={15} />Invite</button>
        <button className="text-slate-400 transition hover:text-slate-100" onClick={onSettings}><Settings size={19} /></button>
        <button className="hidden text-slate-400 transition hover:text-slate-100 sm:block"><Bell size={18} /></button>
        <div className="relative">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white ring-2 ring-teal-400/20 transition hover:ring-teal-300/50" onClick={onProfile}>{displayEmail.slice(0, 1).toUpperCase()}</button>
          {profileOpen && (
            <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-slate-800 bg-[#111827] p-3 shadow-2xl shadow-black/40">
              <div className="px-2 py-2">
                <div className="text-sm font-semibold capitalize text-slate-100">{displayName}</div>
                <div className="mt-1 truncate text-xs text-slate-400">{displayEmail}</div>
              </div>
              <div className="my-2 h-px bg-slate-800" />
              <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-red-950/40" onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function RequestHeader({ collection, draft, onCopy, onSave }: { collection?: Collection; draft: RequestDraft; onCopy: () => void; onSave: () => void }) {
  return (
    <div className="flex min-h-[74px] flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0c0c0c] px-6 py-3">
      <div className="min-w-0">
        <div className="mb-1 flex min-w-0 items-center gap-2 text-sm text-slate-400">
          <FileCode2 size={18} className="text-teal-400" />
          <span className="shrink-0">APIAutopsy</span>
          <span>/</span>
          <span className="truncate">{collection?.name ?? 'Unfiled'}</span>
        </div>
        <div className="truncate text-lg font-semibold text-slate-100">{draft.name}</div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <select className="h-10 max-w-[210px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300">
          <option>No environment</option>
          <option>Local</option>
          <option>Staging</option>
          <option>Production</option>
        </select>
        <button className="h-10 rounded-xl border border-slate-700 px-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900" onClick={onSave}>Save</button>
        <button className="flex h-10 items-center gap-2 rounded-xl border border-slate-700 px-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900" onClick={onCopy}>Share <Copy size={15} /></button>
      </div>
    </div>
  );
}

function FlowsPage({ collections, requests, workspaceId }: { collections: Collection[]; requests: ApiRequest[]; workspaceId?: string }) {
  const [collectionId, setCollectionId] = useState('');
  const activeCollectionId = collectionId || collections[0]?.id;
  const workflowSteps = useWorkflowSteps(workspaceId, activeCollectionId);
  const saveSteps = useSaveWorkflowSteps(workspaceId, activeCollectionId);
  const runWorkflow = useRunWorkflow(workspaceId, activeCollectionId);
  const workflowRuns = useWorkflowRuns(workspaceId, activeCollectionId);
  const collectionRequests = requests.filter((request) => request.collectionId === activeCollectionId);
  const [draftSteps, setDraftSteps] = useState<{ apiRequestId: string; variableName: string; jsonPath: string; stopOnFailure: boolean }[]>([]);

  useEffect(() => {
    setDraftSteps((workflowSteps.data ?? []).map((step) => ({
      apiRequestId: step.apiRequestId,
      variableName: step.extractionRules[0]?.variableName ?? '',
      jsonPath: step.extractionRules[0]?.jsonPath ?? '',
      stopOnFailure: step.stopOnFailure
    })));
  }, [workflowSteps.data, activeCollectionId]);

  function addStep() {
    const nextRequest = collectionRequests.find((request) => !draftSteps.some((step) => step.apiRequestId === request.id)) ?? collectionRequests[0] ?? requests[0];
    if (!nextRequest) return;
    setDraftSteps((current) => [...current, { apiRequestId: nextRequest.id, variableName: '', jsonPath: '', stopOnFailure: true }]);
  }

  async function saveWorkflow() {
    await saveSteps.mutateAsync(draftSteps.map((step, index) => ({
      apiRequestId: step.apiRequestId,
      stepOrder: index + 1,
      stopOnFailure: step.stopOnFailure,
      extractionRules: step.variableName && step.jsonPath ? [{ variableName: step.variableName, jsonPath: step.jsonPath }] : []
    })));
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-[#0c0c0c] p-6 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Execution Flow</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">Build chained collection workflows. Extract values from one response and use them later as <span className="font-mono text-indigo-300">{'{{variableName}}'}</span>.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50" disabled={!activeCollectionId || runWorkflow.isPending} onClick={() => runWorkflow.mutate()}>{runWorkflow.isPending ? 'Running' : 'Run workflow'}</button>
          <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50" disabled={!activeCollectionId || saveSteps.isPending} onClick={saveWorkflow}>{saveSteps.isPending ? 'Saving' : 'Save flow'}</button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <FieldLabel>Collection workflow</FieldLabel>
          <select className="mb-5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" value={activeCollectionId ?? ''} onChange={(event) => setCollectionId(event.target.value)}>
            {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>

          <div className="space-y-3">
            {draftSteps.map((step, index) => {
              const request = requests.find((item) => item.id === step.apiRequestId);
              return (
                <div key={`${step.apiRequestId}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">Step {index + 1}</div>
                    <button className="text-xs font-semibold text-red-300 hover:text-red-200" onClick={() => setDraftSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[1fr_160px]">
                    <select className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" value={step.apiRequestId} onChange={(event) => setDraftSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, apiRequestId: event.target.value } : item))}>
                      {requests.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" checked={step.stopOnFailure} onChange={(event) => setDraftSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stopOnFailure: event.target.checked } : item))} />
                      Stop on failure
                    </label>
                  </div>
                  <div className="mt-2 truncate text-xs text-slate-500">{request?.method} {request?.url}</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500" placeholder="Variable name, e.g. token" value={step.variableName} onChange={(event) => setDraftSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, variableName: event.target.value } : item))} />
                    <input className="h-10 rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500" placeholder="JSON path, e.g. $.token" value={step.jsonPath} onChange={(event) => setDraftSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, jsonPath: event.target.value } : item))} />
                  </div>
                </div>
              );
            })}
            <button className="w-full rounded-2xl border border-dashed border-slate-700 px-4 py-4 text-sm font-semibold text-slate-300 hover:border-indigo-500 hover:text-slate-100" onClick={addStep}>+ Add API step</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <h2 className="text-sm font-semibold text-slate-100">Workflow reporting</h2>
          <div className="mt-4 space-y-3">
            {(workflowRuns.data ?? []).slice(0, 8).map((run) => (
              <div key={run.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={run.success ? 'font-semibold text-teal-300' : 'font-semibold text-red-300'}>{run.success ? 'Success' : 'Failed'}</span>
                  <span className="text-slate-400">{run.totalDurationMs} ms</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{new Date(run.startedAt).toLocaleString()}</div>
                <div className="mt-3 space-y-2">
                  {run.logs.map((log) => (
                    <div key={log.id} className="grid grid-cols-[1fr_70px_70px] gap-2 text-xs">
                      <span className="truncate text-slate-300">{log.stepOrder}. {log.stepName}</span>
                      <span className={log.success ? 'text-teal-300' : 'text-red-300'}>{log.success ? 'OK' : 'Fail'}</span>
                      <span className="text-slate-500">{log.responseTimeMs} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(workflowRuns.data ?? []).length === 0 && <div className="text-sm text-slate-500">Run this workflow once to see step-by-step execution logs.</div>}
          </div>
        </section>
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
    authType: request.authType,
    certificateId: request.certificateId ?? ''
  };
}

function toPayloadFromDraft(draft: RequestDraft, parseJson: (value: string) => Record<string, unknown>) {
  const auth = buildAuthPayload(draft);
  return {
    collectionId: draft.collectionId || undefined,
    name: draft.name.trim() || 'Untitled Request',
    method: draft.method,
    url: draft.url.trim(),
    headers: normalizeHeaders(parseJson(draft.headers), draft),
    queryParams: parseJson(draft.params),
    bodyType: resolveBodyType(draft),
    body: resolveBody(draft, parseJson),
    authType: draft.authType,
    certificateId: draft.certificateId || undefined,
    auth
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
