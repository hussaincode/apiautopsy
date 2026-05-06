import { Activity, AlertTriangle, Bell, CalendarClock, CheckCircle2, Clock3, Copy, Edit3, ExternalLink, Gauge, Globe2, Info, Plus, Power, SearchCheck, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAlertIncidents, useAlertRules, useCreateAssertion, useDeleteAssertion, useResolveAlertIncident, useSaveAlertRule, useScheduleAssertions, useScheduleDetail } from '../api/hooks';
import { Button, EmptyState, FieldLabel, Input, Select } from '../components/ui';
import type { AlertIncident, AlertRule, ApiRequest, AssertionType, Execution, Schedule, ScheduleAssertion, ScheduleType } from '../types/domain';
import type { Collection } from '../types/domain';

type SchedulePayload = {
  apiRequestId?: string;
  collectionId?: string;
  targetType?: Schedule['targetType'];
  name: string;
  scheduleType: ScheduleType;
  intervalMinutes?: number;
  cronExpression?: string;
  enabled: boolean;
  sloUptimeTarget?: number;
  sloLatencyP95Ms?: number;
  publicStatusEnabled?: boolean;
  publicSlug?: string;
};

export function SchedulerPage({
  executions,
  isCreating,
  requests,
  schedules,
  workspaceId,
  collections = [],
  onDeleteSchedule,
  onSaveSchedule,
  onToggleSchedule
}: {
  executions: Execution[];
  isCreating: boolean;
  requests: ApiRequest[];
  schedules: Schedule[];
  workspaceId?: string;
  collections?: Collection[];
  onCreateSchedule: (payload: SchedulePayload) => void;
  onDeleteSchedule: (schedule: Schedule) => Promise<void> | void;
  onSaveSchedule: (scheduleId: string | undefined, payload: SchedulePayload) => Promise<void>;
  onToggleSchedule: (schedule: Schedule) => Promise<void> | void;
}) {
  const [modalSchedule, setModalSchedule] = useState<Schedule | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [alertSchedule, setAlertSchedule] = useState<Schedule | undefined>();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>();
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId) ?? schedules[0];
  const collectionById = useMemo(() => new Map(collections.map((collection) => [collection.id, collection])), [collections]);
  const selectedRequest = selectedSchedule?.apiRequestId ? requestById.get(selectedSchedule.apiRequestId) : undefined;
  const selectedCollection = selectedSchedule?.collectionId ? collectionById.get(selectedSchedule.collectionId) : undefined;
  const detail = useScheduleDetail(workspaceId, selectedSchedule?.id);
  const assertions = useScheduleAssertions(workspaceId, selectedSchedule?.id);
  const createAssertion = useCreateAssertion(workspaceId, selectedSchedule?.id);
  const deleteAssertion = useDeleteAssertion(workspaceId, selectedSchedule?.id);
  const alertRules = useAlertRules(workspaceId);
  const alertIncidents = useAlertIncidents(workspaceId);
  const saveAlertRule = useSaveAlertRule(workspaceId);
  const resolveAlertIncident = useResolveAlertIncident(workspaceId);
  const ruleByScheduleId = useMemo(() => new Map((alertRules.data ?? []).map((rule) => [rule.scheduleId, rule])), [alertRules.data]);
  const openIncidents = useMemo(() => (alertIncidents.data ?? []).filter((incident) => incident.status === 'OPEN'), [alertIncidents.data]);

  useEffect(() => {
    if (!selectedScheduleId && schedules.length > 0) setSelectedScheduleId(schedules[0].id);
  }, [schedules, selectedScheduleId]);

  function openCreate() {
    setModalSchedule(undefined);
    setModalOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setModalSchedule(schedule);
    setModalOpen(true);
  }

  function deleteSchedule(schedule: Schedule) {
    if (window.confirm(`Delete schedule "${schedule.name}" and stop future monitoring runs?`)) {
      onDeleteSchedule(schedule);
      if (selectedScheduleId === schedule.id) setSelectedScheduleId(undefined);
    }
  }

  function selectSchedule(scheduleId: string) {
    setSelectedScheduleId(scheduleId);
  }

  async function toggleAlertRule(schedule: Schedule, rule?: AlertRule) {
    await saveAlertRule.mutateAsync({
      scheduleId: schedule.id,
      payload: {
        enabled: !(rule?.enabled ?? false),
        alertOnFailure: rule?.alertOnFailure ?? true,
        latencyThresholdMs: rule?.latencyThresholdMs ?? 1500,
        consecutiveFailuresThreshold: rule?.consecutiveFailuresThreshold ?? 1,
        emailRecipients: rule?.emailRecipients ?? [],
        webhookUrl: rule?.webhookUrl
      }
    });
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-[#0c0c0c] p-6 text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Monitoring Scheduler</h1>
          <p className="mt-1 text-sm text-slate-400">Run saved API requests automatically and track uptime, latency, and failures.</p>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400" onClick={openCreate}>
          <Plus size={16} />Create Schedule
        </button>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(520px,1fr)_minmax(360px,440px)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
          <div className="hidden grid-cols-[minmax(220px,1.8fr)_118px_92px_104px_132px_100px_92px_172px] gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 min-[1180px]:grid">
            <div>API</div>
            <div>Schedule</div>
            <div>Status</div>
            <div>Alerts</div>
            <div>Last run</div>
            <div>Latency</div>
            <div>Success</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-800">
            {schedules.map((schedule) => {
              const request = schedule.apiRequestId ? requestById.get(schedule.apiRequestId) : undefined;
              const collection = schedule.collectionId ? collectionById.get(schedule.collectionId) : undefined;
              const metrics = calculateMetrics(executions.filter((execution) => execution.scheduleId === schedule.id || (schedule.apiRequestId && execution.apiRequestId === schedule.apiRequestId)));
              const active = selectedSchedule?.id === schedule.id;
              const rule = ruleByScheduleId.get(schedule.id);
              const incidentOpen = openIncidents.some((incident) => incident.scheduleId === schedule.id);
              const title = schedule.targetType === 'WORKFLOW' ? collection?.name ?? 'Collection workflow' : request?.name ?? 'Unknown API';
              const subtitle = schedule.targetType === 'WORKFLOW' ? 'Workflow schedule' : `${request?.method ?? ''} ${request?.url ?? ''}`;
              return (
                <div
                  key={schedule.id}
                  role="button"
                  tabIndex={0}
                  className={`group grid w-full cursor-pointer grid-cols-1 gap-4 px-4 py-4 text-left text-sm outline-none transition min-[1180px]:grid-cols-[minmax(220px,1.8fr)_118px_92px_104px_132px_100px_92px_172px] min-[1180px]:items-center min-[1180px]:gap-3 ${active ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/60' : 'hover:bg-slate-900/70 focus:bg-slate-900/70'}`}
                  onClick={() => selectSchedule(schedule.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectSchedule(schedule.id);
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-slate-100">{title}</span>
                      <span className="rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-300 min-[1180px]:hidden">{formatSchedule(schedule)}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div>
                  </div>
                  <DataCell label="Schedule" className="hidden min-[1180px]:block">{formatSchedule(schedule)}</DataCell>
                  <DataCell label="Status">
                    <StatusPill active={schedule.enabled} activeLabel="ON" inactiveLabel="OFF" />
                  </DataCell>
                  <DataCell label="Alerts">
                    <button
                      aria-label={rule?.enabled ? 'Turn alerts off' : 'Turn alerts on'}
                      className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition hover:scale-[1.03] disabled:cursor-wait disabled:opacity-60 ${incidentOpen ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : rule?.enabled ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-100'}`}
                      disabled={saveAlertRule.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleAlertRule(schedule, rule);
                      }}
                    >
                      {incidentOpen ? <AlertTriangle size={13} /> : <Bell size={13} />}
                      {incidentOpen ? 'OPEN' : rule?.enabled ? 'ON' : 'OFF'}
                    </button>
                  </DataCell>
                  <DataCell label="Last run">{schedule.lastRunAt ? formatDateTime(schedule.lastRunAt) : 'Never'}</DataCell>
                  <DataCell label="Latency" strong>{metrics.totalRuns ? `${metrics.avgLatencyMs.toFixed(0)} ms` : 'N/A'}</DataCell>
                  <DataCell label="Success" strong>{metrics.totalRuns ? `${metrics.successRate.toFixed(0)}%` : 'N/A'}</DataCell>
                  <div className="flex flex-wrap items-center gap-2 min-[1180px]:justify-end" onClick={(event) => event.stopPropagation()}>
                    <ActionButton label={schedule.enabled ? 'Turn off' : 'Turn on'} onClick={() => onToggleSchedule(schedule)}><Power size={15} /><span>{schedule.enabled ? 'Off' : 'On'}</span></ActionButton>
                    <IconButton label="Alert settings" onClick={() => setAlertSchedule(schedule)}><Bell size={15} /></IconButton>
                    <IconButton label="Edit" onClick={() => openEdit(schedule)}><Edit3 size={15} /></IconButton>
                    <IconButton label="Delete" danger onClick={() => deleteSchedule(schedule)}><Trash2 size={15} /></IconButton>
                  </div>
                </div>
              );
            })}
          </div>

          {schedules.length === 0 && <div className="p-6"><EmptyState title="No schedules yet" body="Create a monitor from a saved API request. Simple intervals are best for first-time users; cron is available for advanced scheduling." /></div>}
        </section>

        <ScheduleDetailPanel
          executions={detail.data?.executions ?? []}
          isLoading={detail.isLoading}
          metrics={detail.data?.metrics ?? calculateMetrics(executions.filter((execution) => selectedSchedule && (execution.scheduleId === selectedSchedule.id || (selectedSchedule.apiRequestId && execution.apiRequestId === selectedSchedule.apiRequestId))))}
          request={selectedRequest}
          collectionName={selectedCollection?.name}
          incidents={(alertIncidents.data ?? []).filter((incident) => selectedSchedule && incident.scheduleId === selectedSchedule.id)}
          onResolveIncident={(incidentId) => resolveAlertIncident.mutate(incidentId)}
          assertions={assertions.data ?? []}
          onCreateAssertion={(payload) => createAssertion.mutateAsync(payload)}
          onDeleteAssertion={(assertionId) => deleteAssertion.mutateAsync(assertionId)}
          schedule={selectedSchedule}
        />
      </div>

      {modalOpen && (
        <ScheduleModal
          isSaving={isCreating}
          requests={requests}
          collections={collections}
          schedule={modalSchedule}
          onClose={() => setModalOpen(false)}
          onSave={async (payload) => {
            await onSaveSchedule(modalSchedule?.id, payload);
            setModalOpen(false);
          }}
        />
      )}

      {alertSchedule && (
        <AlertRuleModal
          isSaving={saveAlertRule.isPending}
          rule={ruleByScheduleId.get(alertSchedule.id)}
          schedule={alertSchedule}
          onClose={() => setAlertSchedule(undefined)}
          onSave={async (payload) => {
            await saveAlertRule.mutateAsync({ scheduleId: alertSchedule.id, payload });
            setAlertSchedule(undefined);
          }}
        />
      )}
    </div>
  );
}

function ScheduleDetailPanel({ assertions, collectionName, executions, incidents, isLoading, metrics, onCreateAssertion, onDeleteAssertion, onResolveIncident, request, schedule }: { assertions: ScheduleAssertion[]; collectionName?: string; executions: Execution[]; incidents: AlertIncident[]; isLoading: boolean; metrics: ReturnType<typeof calculateMetrics>; onCreateAssertion: (payload: Partial<ScheduleAssertion>) => Promise<unknown>; onDeleteAssertion: (assertionId: string) => Promise<unknown>; onResolveIncident: (incidentId: string) => void; request?: ApiRequest; schedule?: Schedule }) {
  if (!schedule) {
    return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl shadow-black/20"><EmptyState title="Select a schedule" body="Choose a schedule to inspect uptime, latency, and execution history." /></section>;
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
      <div className="border-b border-slate-800 p-5">
        <div className="text-xs font-semibold uppercase text-slate-500">Monitor detail</div>
        <h2 className="mt-1 truncate text-lg font-semibold text-slate-100">{schedule.name}</h2>
        <p className="mt-1 truncate text-sm text-slate-400">{schedule.targetType === 'WORKFLOW' ? `Workflow: ${collectionName ?? 'Collection'}` : `${request?.method} ${request?.url}`}</p>
      </div>

      <div className="p-5 pb-0">
        <PublicStatusCard schedule={schedule} />
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <MetricCard icon={<Activity size={16} />} label="Checks run" value={metrics.totalRuns} description="How many scheduled checks APIAutopsy has executed." />
        <MetricCard icon={<CheckCircle2 size={16} />} label="Healthy checks" value={`${metrics.successRate.toFixed(1)}%`} description="Runs that passed HTTP and response checks." />
        <MetricCard icon={<Gauge size={16} />} label="Typical slowest response" value={`${(metrics.p95LatencyMs ?? metrics.avgLatencyMs).toFixed(0)} ms`} description="p95 latency: 95% of checks were this fast or faster." tone={metrics.latencySloMet === false ? 'bad' : 'normal'} />
        <MetricCard icon={<X size={16} />} label="Error budget left" value={`${(metrics.errorBudgetRemainingPercent ?? 100).toFixed(0)}%`} description="How much failure room remains before the uptime target is missed." tone={(metrics.errorBudgetRemainingPercent ?? 100) <= 0 ? 'bad' : 'normal'} />
      </div>

      <div className="px-5 pb-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 text-indigo-300" size={16} />
            <div>
              <div className="font-semibold text-slate-100">Health targets</div>
              <p className="mt-1 leading-5 text-slate-500">These targets decide whether the monitor appears healthy, degraded, or down on the status page.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-950/70 p-3">
              <span className="text-xs uppercase text-slate-500">Uptime target</span>
              <div className="mt-1 font-semibold text-slate-100">{schedule.sloUptimeTarget ?? 99}% of checks should pass</div>
            </div>
            <div className="rounded-lg bg-slate-950/70 p-3">
              <span className="text-xs uppercase text-slate-500">Latency target</span>
              <div className="mt-1 font-semibold text-slate-100">p95 response under {schedule.sloLatencyP95Ms ?? 1000} ms</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <AssertionsPanel assertions={assertions} onCreate={onCreateAssertion} onDelete={onDeleteAssertion} />
      </div>

      <div className="px-5 pb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Alert incidents</h3>
          <span className="text-xs text-slate-500">{incidents.filter((incident) => incident.status === 'OPEN').length} open</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          {incidents.slice(0, 4).map((incident) => (
            <div key={incident.id} className="flex items-start justify-between gap-3 border-b border-slate-800 px-3 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className={`font-semibold ${incident.status === 'OPEN' ? 'text-red-300' : 'text-teal-300'}`}>{incident.status}</div>
                <div className="mt-1 truncate text-slate-300">{incident.reason}</div>
                <div className="mt-1 text-xs text-slate-500">Last triggered {new Date(incident.lastTriggeredAt).toLocaleString()}</div>
              </div>
              {incident.status === 'OPEN' && (
                <button className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-teal-400 hover:text-teal-300" onClick={() => onResolveIncident(incident.id)}>
                  Resolve
                </button>
              )}
            </div>
          ))}
          {incidents.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No alert incidents for this schedule.</div>}
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Execution history</h3>
          {isLoading && <span className="text-xs text-slate-500">Refreshing...</span>}
        </div>
        <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-800">
          {executions.length > 0 && (
            <div className="grid grid-cols-[minmax(0,1.35fr)_90px_88px_64px] gap-3 border-b border-slate-800 bg-slate-950/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <div>Time</div>
              <div>Status</div>
              <div>Latency</div>
              <div>Code</div>
            </div>
          )}
          {executions.map((execution) => (
            <div key={execution.id} className="grid grid-cols-[minmax(0,1.35fr)_90px_88px_64px] gap-3 border-b border-slate-800 px-4 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className="break-words leading-5 text-slate-200">{formatDateTime(execution.executedAt)}</div>
                {execution.errorMessage && <div className="mt-1 truncate text-xs text-red-300">{execution.errorMessage}</div>}
                {execution.assertionPassed === false && <div className="mt-1 text-xs text-amber-300">Assertion failed</div>}
              </div>
              <div className={`min-w-0 truncate font-semibold ${execution.success ? 'text-teal-300' : 'text-red-300'}`}>{execution.success ? 'Success' : 'Failure'}</div>
              <div className="whitespace-nowrap text-slate-300">{execution.responseTimeMs} ms</div>
              <div className="whitespace-nowrap text-slate-400">{execution.statusCode ?? 'N/A'}</div>
            </div>
          ))}
          {executions.length === 0 && <div className="p-5 text-center text-sm text-slate-500">No scheduled executions yet. The next due run will appear here.</div>}
        </div>
      </div>
    </section>
  );
}

function PublicStatusCard({ schedule }: { schedule: Schedule }) {
  const [copied, setCopied] = useState(false);
  const publicPath = schedule.publicStatusEnabled && schedule.publicSlug ? `/status/${schedule.publicSlug}` : undefined;
  const publicUrl = publicPath && typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath;

  async function copyLink() {
    if (!publicUrl) return;
    await navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-indigo-400/20 bg-indigo-500/10">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-400/15 text-indigo-200">
          <Globe2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-100">Public status page</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${publicPath ? 'bg-teal-500/15 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>
              {publicPath ? 'Published' : 'Not published'}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-400">
            Share this read-only page with clients or teammates. It shows API health, uptime, and recent checks without exposing response bodies or secrets.
          </p>
          {publicPath ? (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-2">
              <div className="truncate font-mono text-xs text-slate-300">{publicUrl}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-500 px-3 text-xs font-semibold text-white transition hover:bg-indigo-400" href={publicPath} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} />Open page
                </a>
                <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white" onClick={copyLink}>
                  <Copy size={14} />{copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs leading-5 text-slate-500">
              Turn on "Publish read-only status page" when creating or editing this schedule to get a shareable `/status/...` link.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRuleModal({ isSaving, rule, schedule, onClose, onSave }: { isSaving: boolean; rule?: AlertRule; schedule: Schedule; onClose: () => void; onSave: (payload: Partial<AlertRule>) => Promise<void> }) {
  const [draft, setDraft] = useState({
    enabled: rule?.enabled ?? true,
    alertOnFailure: rule?.alertOnFailure ?? true,
    latencyThresholdMs: rule?.latencyThresholdMs?.toString() ?? '1500',
    consecutiveFailuresThreshold: rule?.consecutiveFailuresThreshold?.toString() ?? '1',
    emailRecipients: rule?.emailRecipients?.join(', ') ?? '',
    webhookUrl: rule?.webhookUrl ?? ''
  });

  const recipients = draft.emailRecipients.split(',').map((email) => email.trim()).filter(Boolean);
  const latency = draft.latencyThresholdMs.trim() ? Number(draft.latencyThresholdMs) : undefined;
  const consecutive = Math.max(1, Number(draft.consecutiveFailuresThreshold || 1));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-2xl shadow-black/50">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-100"><Bell size={18} />Alert settings</div>
            <div className="mt-1 text-xs text-slate-500">{schedule.name}</div>
          </div>
          <button className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <span className="flex items-center gap-2"><ShieldCheck size={16} />Enable smart alerts</span>
            <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={draft.alertOnFailure} onChange={(event) => setDraft({ ...draft, alertOnFailure: event.target.checked })} />
            Alert when request fails or returns non-success status
          </label>

          <label className="block">
            <FieldLabel>Latency threshold</FieldLabel>
            <div className="flex items-center gap-2">
              <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" inputMode="numeric" value={draft.latencyThresholdMs} onChange={(event) => setDraft({ ...draft, latencyThresholdMs: event.target.value })} />
              <span className="text-sm text-slate-500">ms</span>
            </div>
          </label>

          <label className="block">
            <FieldLabel>Consecutive failures before alert</FieldLabel>
            <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.consecutiveFailuresThreshold} onChange={(event) => setDraft({ ...draft, consecutiveFailuresThreshold: event.target.value })}>
              <option value="1">1 failure</option>
              <option value="2">2 failures</option>
              <option value="3">3 failures</option>
              <option value="5">5 failures</option>
            </Select>
          </label>

          <label className="block">
            <FieldLabel>Additional alert emails</FieldLabel>
            <textarea
              className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
              placeholder="client@company.com, ops@company.com"
              value={draft.emailRecipients}
              onChange={(event) => setDraft({ ...draft, emailRecipients: event.target.value })}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">The schedule creator is notified automatically. Add any teammate, client, or support inbox that should also receive alerts.</p>
          </label>

          <label className="block">
            <FieldLabel>Webhook URL</FieldLabel>
            <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" placeholder="https://hooks.slack.com/services/..." value={draft.webhookUrl} onChange={(event) => setDraft({ ...draft, webhookUrl: event.target.value })} />
            <p className="mt-2 text-xs leading-5 text-slate-500">Optional HTTPS endpoint for triggered and recovered alerts.</p>
          </label>
        </div>

        <div className="shrink-0 flex justify-end gap-2 border-t border-slate-800 bg-[#111827] px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button
            className="flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            disabled={isSaving || (latency !== undefined && (!Number.isFinite(latency) || latency < 1))}
            onClick={() => onSave({
              enabled: draft.enabled,
              alertOnFailure: draft.alertOnFailure,
              latencyThresholdMs: latency,
              consecutiveFailuresThreshold: consecutive,
              emailRecipients: recipients,
              webhookUrl: draft.webhookUrl.trim() || undefined
            })}
          >
            <CheckCircle2 size={16} />Save alerts
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({ collections, isSaving, requests, schedule, onClose, onSave }: { collections: Collection[]; isSaving: boolean; requests: ApiRequest[]; schedule?: Schedule; onClose: () => void; onSave: (payload: SchedulePayload) => Promise<void> }) {
  const [draft, setDraft] = useState({
    targetType: schedule?.targetType ?? 'REQUEST' as Schedule['targetType'],
    apiRequestId: schedule?.apiRequestId ?? requests[0]?.id ?? '',
    collectionId: schedule?.collectionId ?? collections[0]?.id ?? '',
    name: schedule?.name ?? 'Production health check',
    scheduleType: schedule?.scheduleType ?? 'INTERVAL' as ScheduleType,
    intervalMinutes: schedule?.intervalMinutes ?? 5,
    cronExpression: schedule?.cronExpression ?? '0 */5 * * * *',
    enabled: schedule?.enabled ?? true,
    sloUptimeTarget: schedule?.sloUptimeTarget ?? 99,
    sloLatencyP95Ms: schedule?.sloLatencyP95Ms ?? 1000,
    publicStatusEnabled: schedule?.publicStatusEnabled ?? false,
    publicSlug: schedule?.publicSlug ?? ''
  });

  const canSave = Boolean((draft.targetType === 'WORKFLOW' ? draft.collectionId : draft.apiRequestId) && draft.name.trim() && (draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes >= 1 : draft.cronExpression.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-2xl shadow-black/50">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-100"><CalendarClock size={18} />{schedule ? 'Edit Schedule' : 'Create Schedule'}</div>
          <button className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block">
            <FieldLabel>Schedule target</FieldLabel>
            <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.targetType} onChange={(event) => setDraft({ ...draft, targetType: event.target.value as Schedule['targetType'] })}>
              <option value="REQUEST">Single API request</option>
              <option value="WORKFLOW">Collection workflow</option>
            </Select>
          </label>
          {draft.targetType === 'WORKFLOW' ? (
            <label className="block">
              <FieldLabel>Select collection workflow</FieldLabel>
              <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.collectionId} onChange={(event) => setDraft({ ...draft, collectionId: event.target.value })}>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
              </Select>
            </label>
          ) : (
          <label className="block">
            <FieldLabel>Select API</FieldLabel>
            <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.apiRequestId} onChange={(event) => setDraft({ ...draft, apiRequestId: event.target.value })}>
              {requests.map((request) => <option key={request.id} value={request.id}>{request.name}</option>)}
            </Select>
          </label>
          )}
          <label className="block">
            <FieldLabel>Schedule name</FieldLabel>
            <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>Schedule type</FieldLabel>
            <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.scheduleType} onChange={(event) => setDraft({ ...draft, scheduleType: event.target.value as ScheduleType })}>
              <option value="INTERVAL">Simple interval</option>
              <option value="CRON">Advanced cron</option>
            </Select>
          </label>
          {draft.scheduleType === 'INTERVAL' ? (
            <label className="block">
              <FieldLabel>Run every</FieldLabel>
              <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={draft.intervalMinutes} onChange={(event) => setDraft({ ...draft, intervalMinutes: Number(event.target.value) })}>
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </Select>
            </label>
          ) : (
            <label className="block">
              <FieldLabel>Cron expression</FieldLabel>
              <Input className="w-full rounded-xl border-slate-700 bg-slate-950 font-mono text-slate-100 focus:border-indigo-500" value={draft.cronExpression} onChange={(event) => setDraft({ ...draft, cronExpression: event.target.value })} />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
            Enable schedule
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Uptime SLO target (%)</FieldLabel>
              <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" inputMode="decimal" value={draft.sloUptimeTarget} onChange={(event) => setDraft({ ...draft, sloUptimeTarget: Number(event.target.value) })} />
            </label>
            <label className="block">
              <FieldLabel>P95 latency target (ms)</FieldLabel>
              <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" inputMode="numeric" value={draft.sloLatencyP95Ms} onChange={(event) => setDraft({ ...draft, sloLatencyP95Ms: Number(event.target.value) })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={draft.publicStatusEnabled} onChange={(event) => setDraft({ ...draft, publicStatusEnabled: event.target.checked })} />
            Publish read-only status page
          </label>
          <p className="-mt-2 text-xs leading-5 text-slate-500">Creates a client-safe page with current health, uptime, latency, and recent checks. Response bodies and secrets are never shown.</p>
          {draft.publicStatusEnabled && (
            <label className="block">
              <FieldLabel>Public URL slug</FieldLabel>
              <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" placeholder="production-health" value={draft.publicSlug} onChange={(event) => setDraft({ ...draft, publicSlug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              <p className="mt-2 truncate text-xs text-slate-500">Preview: /status/{draft.publicSlug || 'production-health'}</p>
            </label>
          )}
        </div>
        <div className="shrink-0 flex justify-end gap-2 border-t border-slate-800 bg-[#111827] px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button className="flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50" disabled={isSaving || !canSave} onClick={() => onSave({
            targetType: draft.targetType,
            apiRequestId: draft.targetType === 'REQUEST' ? draft.apiRequestId : undefined,
            collectionId: draft.targetType === 'WORKFLOW' ? draft.collectionId : undefined,
            name: draft.name.trim(),
            scheduleType: draft.scheduleType,
            intervalMinutes: draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes : undefined,
            cronExpression: draft.scheduleType === 'CRON' ? draft.cronExpression.trim() : undefined,
            enabled: draft.enabled,
            sloUptimeTarget: draft.sloUptimeTarget,
            sloLatencyP95Ms: draft.sloLatencyP95Ms,
            publicStatusEnabled: draft.publicStatusEnabled,
            publicSlug: draft.publicStatusEnabled ? draft.publicSlug.trim() : undefined
          })}>
            <CheckCircle2 size={16} />{schedule ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssertionsPanel({ assertions, onCreate, onDelete }: { assertions: ScheduleAssertion[]; onCreate: (payload: Partial<ScheduleAssertion>) => Promise<unknown>; onDelete: (assertionId: string) => Promise<unknown> }) {
  const [draft, setDraft] = useState({
    type: 'STATUS_CODE' as AssertionType,
    name: 'Status is 200',
    expectedStatusCode: '200',
    jsonPath: '$.status',
    expectedValue: '',
    containsText: '',
    maxLatencyMs: '1000',
    maxResponseSizeBytes: '50000'
  });
  const [busy, setBusy] = useState(false);
  const expectedReady = isAssertionExpectedValueReady(draft);

  async function addAssertion() {
    setBusy(true);
    try {
      await onCreate({
        type: draft.type,
        name: draft.name.trim(),
        enabled: true,
        expectedStatusCode: draft.type === 'STATUS_CODE' ? Number(draft.expectedStatusCode) : undefined,
        jsonPath: draft.type === 'JSON_PATH_EXISTS' || draft.type === 'JSON_PATH_EQUALS' ? draft.jsonPath : undefined,
        expectedValue: draft.type === 'JSON_PATH_EQUALS' ? draft.expectedValue : undefined,
        containsText: draft.type === 'BODY_CONTAINS' ? draft.containsText : undefined,
        maxLatencyMs: draft.type === 'MAX_LATENCY_MS' ? Number(draft.maxLatencyMs) : undefined,
        maxResponseSizeBytes: draft.type === 'MAX_RESPONSE_SIZE_BYTES' ? Number(draft.maxResponseSizeBytes) : undefined
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100"><SearchCheck size={16} />Response checks</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">These checks decide if a run is healthy. Use them to catch bad responses even when the API returns HTTP 200.</p>
        </div>
        <span className="text-xs text-slate-500">{assertions.length} checks</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="grid min-w-0 gap-3">
          <label className="min-w-0">
            <FieldLabel>Check name</FieldLabel>
            <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="min-w-0">
              <FieldLabel>Check type</FieldLabel>
              <Select className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as AssertionType })}>
                <option value="STATUS_CODE">Status code is</option>
                <option value="JSON_PATH_EXISTS">JSON field exists</option>
                <option value="JSON_PATH_EQUALS">JSON field equals</option>
                <option value="BODY_CONTAINS">Body contains text</option>
                <option value="MAX_LATENCY_MS">Response is faster than</option>
                <option value="MAX_RESPONSE_SIZE_BYTES">Response size under</option>
              </Select>
            </label>
            <label className="min-w-0">
              <FieldLabel>{expectedFieldLabel(draft.type)}</FieldLabel>
              {draft.type === 'STATUS_CODE' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" inputMode="numeric" value={draft.expectedStatusCode} onChange={(event) => setDraft({ ...draft, expectedStatusCode: event.target.value })} />}
              {draft.type === 'JSON_PATH_EXISTS' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" placeholder="$.data.id" value={draft.jsonPath} onChange={(event) => setDraft({ ...draft, jsonPath: event.target.value })} />}
              {draft.type === 'JSON_PATH_EQUALS' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" placeholder="$.status = active" value={`${draft.jsonPath} = ${draft.expectedValue}`} onChange={(event) => {
            const [path, ...value] = event.target.value.split('=');
            setDraft({ ...draft, jsonPath: path.trim(), expectedValue: value.join('=').trim() });
              }} />}
              {draft.type === 'BODY_CONTAINS' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" placeholder="healthy" value={draft.containsText} onChange={(event) => setDraft({ ...draft, containsText: event.target.value })} />}
              {draft.type === 'MAX_LATENCY_MS' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" inputMode="numeric" value={draft.maxLatencyMs} onChange={(event) => setDraft({ ...draft, maxLatencyMs: event.target.value })} />}
              {draft.type === 'MAX_RESPONSE_SIZE_BYTES' && <Input className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100" inputMode="numeric" value={draft.maxResponseSizeBytes} onChange={(event) => setDraft({ ...draft, maxResponseSizeBytes: event.target.value })} />}
            </label>
          </div>
          <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit" disabled={busy || !draft.name.trim() || !expectedReady} onClick={addAssertion}>
            <Plus size={15} />Add response check
          </button>
        </div>
        <div className="mt-3 divide-y divide-slate-800">
          {assertions.map((assertion) => (
            <div key={assertion.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-200">{assertion.name}</div>
                <div className="text-xs text-slate-500">{describeAssertion(assertion)}</div>
              </div>
              <button className="rounded-lg p-2 text-red-300 hover:bg-red-950/40" aria-label={`Delete assertion ${assertion.name}`} onClick={() => onDelete(assertion.id)}><Trash2 size={15} /></button>
            </div>
          ))}
          {assertions.length === 0 && <div className="py-3 text-center text-sm text-slate-500">Start with "Status code is 200", then add JSON, body text, latency, or response-size checks when needed.</div>}
        </div>
      </div>
    </div>
  );
}

function expectedFieldLabel(type: AssertionType) {
  switch (type) {
    case 'STATUS_CODE': return 'Expected status code';
    case 'JSON_PATH_EXISTS': return 'JSON path to find';
    case 'JSON_PATH_EQUALS': return 'JSON path and expected value';
    case 'BODY_CONTAINS': return 'Text that must appear';
    case 'MAX_LATENCY_MS': return 'Maximum milliseconds';
    case 'MAX_RESPONSE_SIZE_BYTES': return 'Maximum bytes';
  }
}

function isAssertionExpectedValueReady(draft: { type: AssertionType; expectedStatusCode: string; jsonPath: string; expectedValue: string; containsText: string; maxLatencyMs: string; maxResponseSizeBytes: string }) {
  if (draft.type === 'STATUS_CODE') return Number.isFinite(Number(draft.expectedStatusCode));
  if (draft.type === 'JSON_PATH_EXISTS') return draft.jsonPath.trim().startsWith('$.');
  if (draft.type === 'JSON_PATH_EQUALS') return draft.jsonPath.trim().startsWith('$.') && draft.expectedValue.trim().length > 0;
  if (draft.type === 'BODY_CONTAINS') return draft.containsText.trim().length > 0;
  if (draft.type === 'MAX_LATENCY_MS') return Number(draft.maxLatencyMs) > 0;
  return Number(draft.maxResponseSizeBytes) > 0;
}

function describeAssertion(assertion: ScheduleAssertion) {
  switch (assertion.type) {
    case 'STATUS_CODE': return `Status code must be ${assertion.expectedStatusCode}`;
    case 'JSON_PATH_EXISTS': return `JSON path must exist: ${assertion.jsonPath}`;
    case 'JSON_PATH_EQUALS': return `${assertion.jsonPath} must equal ${assertion.expectedValue}`;
    case 'BODY_CONTAINS': return `Body must contain "${assertion.containsText}"`;
    case 'MAX_LATENCY_MS': return `Response must be under ${assertion.maxLatencyMs} ms`;
    case 'MAX_RESPONSE_SIZE_BYTES': return `Response must be under ${assertion.maxResponseSizeBytes} bytes`;
  }
}

function DataCell({ children, className = '', label, strong = false }: { children: React.ReactNode; className?: string; label: string; strong?: boolean }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 min-[1180px]:hidden">{label}</div>
      <div className={`truncate ${strong ? 'font-semibold text-slate-100' : 'text-slate-300'}`}>{children}</div>
    </div>
  );
}

function StatusPill({ active, activeLabel, inactiveLabel }: { active: boolean; activeLabel: string; inactiveLabel: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-teal-500/15 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-teal-300' : 'bg-slate-500'}`} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function ActionButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-xs font-semibold text-slate-200 transition hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-white"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function IconButton({ children, danger = false, label, onClick }: { children: React.ReactNode; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition ${danger ? 'text-red-300 hover:bg-red-950/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function MetricCard({ description, icon, label, tone = 'normal', value }: { description?: string; icon: React.ReactNode; label: string; tone?: 'normal' | 'bad'; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <div className={`text-xl font-semibold ${tone === 'bad' ? 'text-red-300' : 'text-slate-100'}`}>{value}</div>
      {description && <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  );
}

function calculateMetrics(executions: Execution[]) {
  const totalRuns = executions.length;
  const successfulRuns = executions.filter((execution) => execution.success).length;
  const failedRuns = totalRuns - successfulRuns;
  const avgLatencyMs = totalRuns === 0 ? 0 : executions.reduce((sum, execution) => sum + execution.responseTimeMs, 0) / totalRuns;
  const latencies = executions.map((execution) => execution.responseTimeMs).sort((a, b) => a - b);
  const successRate = totalRuns === 0 ? 0 : successfulRuns * 100 / totalRuns;
  const failureRate = totalRuns === 0 ? 0 : failedRuns * 100 / totalRuns;
  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRate,
    failureRate,
    avgLatencyMs,
    p50LatencyMs: percentile(latencies, 50),
    p90LatencyMs: percentile(latencies, 90),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    errorBudgetRemainingPercent: totalRuns === 0 ? 100 : Math.max(0, 100 - failureRate),
    uptimeSloMet: true,
    latencySloMet: true
  };
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

function formatSchedule(schedule: Schedule) {
  if (schedule.scheduleType === 'INTERVAL') return `Every ${schedule.intervalMinutes} min`;
  return schedule.cronExpression ?? 'Cron';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
