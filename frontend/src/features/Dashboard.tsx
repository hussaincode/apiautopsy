import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Copy, FileCode2, Menu, Plus, Search, Settings, UserPlus } from 'lucide-react';
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
  usePublicExecute,
  useRequests,
  useSchedules,
  useToggleSchedule,
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
import { MonitoringPage } from './MonitoringPage';
import { SchedulerPage } from './SchedulerPage';
import { SettingsPage } from './SettingsPage';
import { Sidebar } from './Sidebar';
import type { AppPage, BuilderTab, RequestDraft } from './dashboardTypes';
import { emptyRequestDraft } from './dashboardTypes';
import { createGuestRequest, persistGuestCollections, persistGuestRequests, readGuestCollections, readGuestRequests } from './guestWorkspace';

const pageRoutes: Record<AppPage, string> = {
  requests: '/requests',
  monitoring: '/monitoring',
  scheduler: '/scheduler',
  flows: '/flows',
  settings: '/settings'
};

export function Dashboard() {
  const token = useAuth((state) => state.token);
  const logout = useAuth((state) => state.logout);
  const email = useAuth((state) => state.email);
  const isAuthenticated = Boolean(token);
  const [activePage, setActivePageState] = useState<AppPage>(() => pageFromPath(window.location.pathname));
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
  const [mobilePane, setMobilePane] = useState<'collections' | 'request'>('collections');
  const [authPrompt, setAuthPrompt] = useState('');
  const [guestCollections, setGuestCollections] = useState<Collection[]>(() => readGuestCollections());
  const [guestRequests, setGuestRequests] = useState<ApiRequest[]>(() => readGuestRequests());

  const workspaces = useWorkspaces(isAuthenticated);
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
  const toggleScheduleMutation = useToggleSchedule(workspaceId);
  const deleteSchedule = useDeleteSchedule(workspaceId);
  const execute = useExecute(workspaceId);
  const publicExecute = usePublicExecute();
  const inviteUser = useInviteUser(workspaceId);

  const requestList = isAuthenticated ? requests.data ?? [] : guestRequests;
  const collectionList = isAuthenticated ? collections.data ?? [] : guestCollections;
  const workspaceOptions = isAuthenticated ? workspaces.data ?? [] : [{ id: 'guest', name: 'Guest Workspace', role: 'MEMBER' as const }];
  const selectedRequest = requestList.find((request) => request.id === selectedRequestId);
  const lastExecution = liveExecution ?? executions.data?.find((execution) => execution.apiRequestId === selectedRequestId);

  const visibleRequests = useMemo(() => requestList.filter((request) => {
    const matchesSearch = `${request.name} ${request.url}`.toLowerCase().includes(search.toLowerCase());
    const matchesCollection = selectedCollectionId === 'all' || request.collectionId === selectedCollectionId;
    return matchesSearch && matchesCollection;
  }), [requestList, search, selectedCollectionId]);

  useEffect(() => {
    const onPopState = () => setActivePageState(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isAuthenticated || activePage === 'requests') return;
    setAuthPrompt(protectedFeatureMessage(activePage));
    navigate('requests', true);
  }, [activePage, isAuthenticated]);

  function navigate(page: AppPage, replace = false) {
    if (!isAuthenticated && page !== 'requests') {
      setAuthPrompt(protectedFeatureMessage(page));
      setActivePageState('requests');
      if (window.location.pathname !== pageRoutes.requests) window.history.pushState({ page: 'requests' }, '', pageRoutes.requests);
      return;
    }
    setActivePageState(page);
    const nextPath = pageRoutes[page];
    if (window.location.pathname === nextPath) return;
    const state = { page };
    if (replace) window.history.replaceState(state, '', nextPath);
    else window.history.pushState(state, '', nextPath);
  }

  useEffect(() => {
    if (!selectedRequest) return;
    setDraft(fromRequest(selectedRequest));
  }, [selectedRequest?.id]);

  useEffect(() => {
    if (activePage !== 'requests' || selectedRequestId || visibleRequests.length === 0) return;
    openRequest(visibleRequests[0].id);
  }, [activePage, visibleRequests.length, selectedRequestId]);

  useEffect(() => {
    if (requestList.length > 0 || isAuthenticated) return;
    const starter = createGuestRequest({ ...toPayloadFromDraft(emptyRequestDraft(), parseJson), name: 'Example Request' });
    setGuestRequests(persistGuestRequests([starter]));
  }, [isAuthenticated, requestList.length]);

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
    if (!isAuthenticated) {
      const saved = saveGuestRequest(payload, draft.id);
      openRequest(saved.id);
      setDraft(fromRequest(saved));
      return saved;
    }
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
    const result = isAuthenticated
      ? await execute.mutateAsync(saved.id)
      : await publicExecute.mutateAsync({ ...toPayload(), name: saved.name });
    setLiveExecution(result);
  }

  async function createCollectionFromModal() {
    if (!collectionName.trim()) return;
    if (!isAuthenticated) {
      const collection = { id: crypto.randomUUID(), name: collectionName.trim() };
      const next = [collection, ...guestCollections];
      setGuestCollections(next);
      persistGuestCollections(next);
      setCollectionName('');
      setCollectionModalOpen(false);
      setSelectedCollectionId(collection.id);
      setDraft((current) => ({ ...current, collectionId: collection.id }));
      return;
    }
    const collection = await createCollection.mutateAsync({ name: collectionName.trim() });
    setCollectionName('');
    setCollectionModalOpen(false);
    setSelectedCollectionId(collection.id);
    setDraft((current) => ({ ...current, collectionId: collection.id }));
  }

  async function inviteWorkspaceUser() {
    if (!isAuthenticated) {
      setAuthPrompt('Sign in to invite teammates into a shared workspace.');
      return;
    }
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
      if (!isAuthenticated) {
        const collection: Collection = { id: crypto.randomUUID(), name: item.name ?? 'Imported Collection', description: item.description };
        const importedRequests = Array.isArray(item.requests) ? item.requests : [];
        const localRequests = importedRequests.map((request: any) => ({
          id: crypto.randomUUID(),
          collectionId: collection.id,
          name: request.name ?? 'Imported Request',
          method: request.method ?? 'GET',
          url: request.url,
          headers: request.headers ?? {},
          queryParams: request.queryParams ?? {},
          bodyType: request.bodyType ?? 'NONE',
          body: request.body ?? {},
          authType: request.authType ?? 'NONE'
        } satisfies ApiRequest));
        setGuestCollections((current) => persistGuestCollections([collection, ...current]));
        setGuestRequests((current) => persistGuestRequests([...localRequests, ...current]));
        continue;
      }
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
    navigate('requests');
    const payload = {
      ...toPayloadFromDraft(emptyRequestDraft(collectionId), parseJson),
      name: `New Request ${requestList.length + 1}`
    };
    if (!isAuthenticated) {
      const saved = saveGuestRequest(payload);
      openRequest(saved.id);
      setDraft(fromRequest(saved));
      setMobilePane('request');
      setToast('New request created locally');
      return;
    }
    const saved = await createRequest.mutateAsync(payload);
    openRequest(saved.id);
    setDraft(fromRequest(saved as ApiRequest));
    setMobilePane('request');
    setToast('New request created');
  }

  function openRequest(id: string) {
    setSelectedRequestId(id);
    setLiveExecution(undefined);
    setOpenTabIds((current) => current.includes(id) ? current : [...current, id]);
    navigate('requests');
    setMobilePane('request');
  }

  function closeTab(id: string) {
    setOpenTabIds((current) => current.filter((item) => item !== id));
    if (selectedRequestId === id) {
      const next = openTabIds.find((item) => item !== id);
      setSelectedRequestId(next);
    }
  }

  function createSchedule(payload: Partial<Schedule> & { apiRequestId?: string; collectionId?: string; targetType?: Schedule['targetType']; name: string; scheduleType: Schedule['scheduleType']; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) {
    if (!isAuthenticated) {
      setAuthPrompt('Sign in to schedule and monitor APIs.');
      return;
    }
    createScheduleMutation.mutate(payload);
  }

  async function saveSchedule(scheduleId: string | undefined, payload: Partial<Schedule> & { apiRequestId?: string; collectionId?: string; targetType?: Schedule['targetType']; name: string; scheduleType: Schedule['scheduleType']; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) {
    if (!isAuthenticated) {
      setAuthPrompt('Sign in to schedule and monitor APIs.');
      throw new Error('Authentication required');
    }
    if (scheduleId) return updateSchedule.mutateAsync({ id: scheduleId, payload });
    return createScheduleMutation.mutateAsync(payload);
  }

  async function removeSchedule(schedule: Schedule) {
    if (!isAuthenticated) {
      setAuthPrompt('Sign in to manage monitors.');
      return;
    }
    await deleteSchedule.mutateAsync(schedule.id);
    setToast('Schedule deleted');
  }

  async function toggleSchedule(schedule: Schedule) {
    if (!isAuthenticated) {
      setAuthPrompt('Sign in to manage monitors.');
      return;
    }
    await toggleScheduleMutation.mutateAsync({ id: schedule.id, enabled: !schedule.enabled });
    setToast(`Schedule turned ${schedule.enabled ? 'off' : 'on'}`);
  }

  function saveGuestRequest(payload: ReturnType<typeof toPayload>, existingId?: string) {
    const saved = createGuestRequest(payload, existingId);
    setGuestRequests((current) => persistGuestRequests([saved, ...current.filter((request) => request.id !== saved.id)]));
    return saved;
  }

  return (
    <main className="h-screen overflow-hidden bg-[#0c0c0c] text-slate-100">
      <TopBar authenticated={isAuthenticated} email={email} profileOpen={profileOpen} onHome={() => navigate('requests')} onInvite={() => isAuthenticated ? setInviteModalOpen(true) : setAuthPrompt('Sign in to invite teammates into a shared workspace.')} onLogin={() => window.location.assign('/login')} onLogout={logout} onProfile={() => setProfileOpen((open) => !open)} onSettings={() => navigate('settings')} />
      <div className="flex h-[calc(100vh-48px)] min-h-0">
        <div className="fixed bottom-4 left-1/2 z-40 grid w-[calc(100%-32px)] max-w-sm -translate-x-1/2 grid-cols-2 rounded-2xl border border-slate-800 bg-[#111827]/95 p-1 shadow-2xl shadow-black/40 backdrop-blur md:hidden">
          <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${mobilePane === 'collections' ? 'bg-indigo-500 text-white' : 'text-slate-300'}`} onClick={() => setMobilePane('collections')}>Collections</button>
          <button className={`rounded-xl px-3 py-2 text-sm font-semibold ${mobilePane === 'request' ? 'bg-indigo-500 text-white' : 'text-slate-300'}`} onClick={() => setMobilePane('request')}>Request</button>
        </div>
        <Sidebar
          className={mobilePane === 'collections' ? 'flex' : 'hidden md:flex'}
          activePage={activePage}
          collections={collectionList}
          requests={requestList}
          search={search}
          selectedCollectionId={selectedCollectionId}
          selectedRequestId={selectedRequestId}
          userEmail={email}
          workspaceId={workspaceId ?? 'guest'}
          workspaces={workspaceOptions}
          onCreateCollection={() => setCollectionModalOpen(true)}
          onImport={importCollection}
          onLogout={logout}
          onNewRequest={newRequest}
          onPage={navigate}
          onSearch={setSearch}
          onSelectCollection={setSelectedCollectionId}
          onSelectRequest={openRequest}
          onWorkspace={setActiveWorkspace}
        />

      <section className={`min-h-0 min-w-0 flex-1 ${mobilePane === 'request' ? 'block' : 'hidden md:block'}`}>
        {activePage === 'requests' && (
          <div className="flex h-full min-h-0 flex-col bg-[#0c0c0c]">
            <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              <button className="m-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-sm font-semibold text-slate-200 md:hidden" onClick={() => setMobilePane('collections')}><Menu size={16} />Collections</button>
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
                    isSending={execute.isPending || publicExecute.isPending || createRequest.isPending || updateRequest.isPending}
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

        {activePage === 'monitoring' && (
          <MonitoringPage
            collections={collectionList}
            executions={executions.data ?? []}
            requests={requestList}
            schedules={schedules.data ?? []}
            onOpenScheduler={() => navigate('scheduler')}
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
      {authPrompt && <AuthRequiredModal message={authPrompt} onClose={() => setAuthPrompt('')} />}
      {toast && <div className="fixed bottom-5 right-5 rounded bg-[#111827] px-4 py-3 text-sm text-white shadow-lg" onAnimationEnd={() => setToast('')}>{toast}</div>}
    </main>
  );
}

function TopBar({ authenticated, email, profileOpen, onHome, onInvite, onLogin, onLogout, onProfile, onSettings }: { authenticated: boolean; email?: string | null; profileOpen: boolean; onHome: () => void; onInvite: () => void; onLogin: () => void; onLogout: () => void; onProfile: () => void; onSettings: () => void }) {
  const displayEmail = email ?? 'guest@apiautopsy.com';
  const displayName = displayEmail.split('@')[0].replace(/[._-]+/g, ' ');
  return (
    <header className="flex h-12 min-w-0 items-center border-b border-slate-800 bg-[#111827] px-3 text-slate-100 shadow-lg shadow-black/20">
      <div className="mr-4 flex shrink-0 items-center gap-2">
        <img className="h-8 w-8 rounded-xl shadow-lg shadow-teal-950/30" src="/logo-mark.svg" alt="APIAutopsy" />
      </div>
      <nav className="hidden shrink-0 items-center gap-5 text-[15px] xl:flex">
        <button className="font-medium" onClick={onHome}>Home</button>
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
        {authenticated ? <button className="hidden h-8 items-center gap-1 rounded-xl bg-indigo-500 px-3 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:flex" onClick={onInvite}><UserPlus size={15} />Invite</button> : <button className="hidden h-8 items-center gap-1 rounded-xl bg-indigo-500 px-3 text-sm font-semibold text-white transition hover:bg-indigo-400 sm:flex" onClick={onLogin}>Sign in</button>}
        <button className="text-slate-400 transition hover:text-slate-100" onClick={onSettings}><Settings size={19} /></button>
        <button className="hidden text-slate-400 transition hover:text-slate-100 sm:block"><Bell size={18} /></button>
        <div className="relative">
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white ring-2 ring-teal-400/20 transition hover:ring-teal-300/50" onClick={authenticated ? onProfile : onLogin}>{authenticated ? displayEmail.slice(0, 1).toUpperCase() : 'G'}</button>
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
      <div className="min-w-0 flex-1">
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

function AuthRequiredModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-2xl shadow-black/40">
        <div className="text-lg font-semibold text-white">Sign in required</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">You can keep creating collections and sending one-off API requests without an account.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Keep testing</Button>
          <Button variant="primary" onClick={() => window.location.assign('/login')}>Sign in</Button>
        </div>
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

function pageFromPath(pathname: string): AppPage {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (firstSegment === 'monitoring') return 'monitoring';
  if (firstSegment === 'scheduler') return 'scheduler';
  if (firstSegment === 'flows') return 'flows';
  if (firstSegment === 'settings') return 'settings';
  return 'requests';
}

function inferBodyMode(request: ApiRequest) {
  const contentType = String(request.headers?.['Content-Type'] ?? request.headers?.['content-type'] ?? '').toLowerCase();
  if (request.bodyType === 'NONE') return 'none' as const;
  if (request.bodyType === 'FORM_DATA') return 'form-data' as const;
  if (contentType.includes('x-www-form-urlencoded')) return 'x-www-form-urlencoded' as const;
  return 'raw' as const;
}

function protectedFeatureMessage(page: AppPage) {
  if (page === 'monitoring') return 'Sign in to view production API monitoring, pass/fail trends, availability, and latency analytics.';
  if (page === 'scheduler') return 'Sign in to schedule API checks, monitor uptime, send alerts, and publish status pages.';
  if (page === 'flows') return 'Sign in to save and run workflow-based API monitoring.';
  if (page === 'settings') return 'Sign in to manage workspace settings, certificates, environments, and API secrets.';
  return 'Sign in to use this workspace feature.';
}
