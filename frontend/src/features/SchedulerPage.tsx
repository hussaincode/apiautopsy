import { Activity, CalendarClock, CheckCircle2, Clock3, Edit3, Plus, Power, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useScheduleDetail } from '../api/hooks';
import { Button, EmptyState, FieldLabel, Input, Select } from '../components/ui';
import type { ApiRequest, Execution, Schedule, ScheduleType } from '../types/domain';
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
  onDeleteSchedule: (schedule: Schedule) => void;
  onSaveSchedule: (scheduleId: string | undefined, payload: SchedulePayload) => Promise<void>;
  onToggleSchedule: (schedule: Schedule) => void;
}) {
  const [modalSchedule, setModalSchedule] = useState<Schedule | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>();
  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);
  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId) ?? schedules[0];
  const collectionById = useMemo(() => new Map(collections.map((collection) => [collection.id, collection])), [collections]);
  const selectedRequest = selectedSchedule?.apiRequestId ? requestById.get(selectedSchedule.apiRequestId) : undefined;
  const selectedCollection = selectedSchedule?.collectionId ? collectionById.get(selectedSchedule.collectionId) : undefined;
  const detail = useScheduleDetail(workspaceId, selectedSchedule?.id);

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

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
          <div className="grid grid-cols-[1.4fr_1fr_86px_150px_110px_110px_118px] border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
            <div>API</div>
            <div>Schedule</div>
            <div>Status</div>
            <div>Last run</div>
            <div>Avg latency</div>
            <div>Success</div>
            <div className="text-right">Controls</div>
          </div>

          {schedules.map((schedule) => {
            const request = schedule.apiRequestId ? requestById.get(schedule.apiRequestId) : undefined;
            const collection = schedule.collectionId ? collectionById.get(schedule.collectionId) : undefined;
            const metrics = calculateMetrics(executions.filter((execution) => execution.scheduleId === schedule.id || (schedule.apiRequestId && execution.apiRequestId === schedule.apiRequestId)));
            const active = selectedSchedule?.id === schedule.id;
            return (
              <button key={schedule.id} className={`grid w-full grid-cols-[1.4fr_1fr_86px_150px_110px_110px_118px] items-center border-b border-slate-800 px-4 py-4 text-left text-sm transition last:border-b-0 ${active ? 'bg-indigo-500/10' : 'hover:bg-slate-900/70'}`} onClick={() => setSelectedScheduleId(schedule.id)}>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-100">{schedule.targetType === 'WORKFLOW' ? collection?.name ?? 'Collection workflow' : request?.name ?? 'Unknown API'}</div>
                  <div className="truncate text-xs text-slate-500">{schedule.targetType === 'WORKFLOW' ? 'Workflow schedule' : `${request?.method} ${request?.url}`}</div>
                </div>
                <div className="truncate text-slate-300">{formatSchedule(schedule)}</div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${schedule.enabled ? 'bg-teal-500/15 text-teal-300' : 'bg-slate-800 text-slate-400'}`}>{schedule.enabled ? 'ON' : 'OFF'}</span>
                <div className="text-slate-400">{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Never'}</div>
                <div className="font-semibold text-slate-200">{metrics.totalRuns ? `${metrics.avgLatencyMs.toFixed(0)} ms` : 'N/A'}</div>
                <div className="font-semibold text-slate-200">{metrics.totalRuns ? `${metrics.successRate.toFixed(0)}%` : 'N/A'}</div>
                <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
                  <IconButton label={schedule.enabled ? 'Disable' : 'Enable'} onClick={() => onToggleSchedule(schedule)}><Power size={15} /></IconButton>
                  <IconButton label="Edit" onClick={() => openEdit(schedule)}><Edit3 size={15} /></IconButton>
                  <IconButton label="Delete" danger onClick={() => deleteSchedule(schedule)}><Trash2 size={15} /></IconButton>
                </div>
              </button>
            );
          })}

          {schedules.length === 0 && <div className="p-6"><EmptyState title="No schedules yet" body="Create a monitor from a saved API request. Simple intervals are best for first-time users; cron is available for advanced scheduling." /></div>}
        </section>

        <ScheduleDetailPanel
          executions={detail.data?.executions ?? []}
          isLoading={detail.isLoading}
          metrics={detail.data?.metrics ?? calculateMetrics(executions.filter((execution) => selectedSchedule && (execution.scheduleId === selectedSchedule.id || (selectedSchedule.apiRequestId && execution.apiRequestId === selectedSchedule.apiRequestId))))}
          request={selectedRequest}
          collectionName={selectedCollection?.name}
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
    </div>
  );
}

function ScheduleDetailPanel({ collectionName, executions, isLoading, metrics, request, schedule }: { collectionName?: string; executions: Execution[]; isLoading: boolean; metrics: ReturnType<typeof calculateMetrics>; request?: ApiRequest; schedule?: Schedule }) {
  if (!schedule) {
    return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-xl shadow-black/20"><EmptyState title="Select a schedule" body="Choose a schedule to inspect uptime, latency, and execution history." /></section>;
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
      <div className="border-b border-slate-800 p-5">
        <div className="text-xs font-semibold uppercase text-slate-500">Monitor detail</div>
        <h2 className="mt-1 truncate text-lg font-semibold text-slate-100">{schedule.name}</h2>
        <p className="mt-1 truncate text-sm text-slate-400">{schedule.targetType === 'WORKFLOW' ? `Workflow: ${collectionName ?? 'Collection'}` : `${request?.method} ${request?.url}`}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <MetricCard icon={<Activity size={16} />} label="Total runs" value={metrics.totalRuns} />
        <MetricCard icon={<CheckCircle2 size={16} />} label="Success" value={`${metrics.successRate.toFixed(1)}%`} />
        <MetricCard icon={<Clock3 size={16} />} label="Avg latency" value={`${metrics.avgLatencyMs.toFixed(0)} ms`} />
        <MetricCard icon={<X size={16} />} label="Failure" value={`${metrics.failureRate.toFixed(1)}%`} tone="bad" />
      </div>

      <div className="px-5 pb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Execution history</h3>
          {isLoading && <span className="text-xs text-slate-500">Refreshing...</span>}
        </div>
        <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-800">
          {executions.map((execution) => (
            <div key={execution.id} className="grid grid-cols-[1fr_82px_88px_88px] gap-3 border-b border-slate-800 px-3 py-3 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className="text-slate-200">{new Date(execution.executedAt).toLocaleString()}</div>
                {execution.errorMessage && <div className="mt-1 truncate text-xs text-red-300">{execution.errorMessage}</div>}
              </div>
              <div className={execution.success ? 'font-semibold text-teal-300' : 'font-semibold text-red-300'}>{execution.success ? 'Success' : 'Failure'}</div>
              <div className="text-slate-300">{execution.responseTimeMs} ms</div>
              <div className="text-slate-400">{execution.statusCode ?? 'N/A'}</div>
            </div>
          ))}
          {executions.length === 0 && <div className="p-5 text-center text-sm text-slate-500">No scheduled executions yet. The next due run will appear here.</div>}
        </div>
      </div>
    </section>
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
    enabled: schedule?.enabled ?? true
  });

  const canSave = Boolean((draft.targetType === 'WORKFLOW' ? draft.collectionId : draft.apiRequestId) && draft.name.trim() && (draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes >= 1 : draft.cronExpression.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#111827] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-slate-100"><CalendarClock size={18} />{schedule ? 'Edit Schedule' : 'Create Schedule'}</div>
          <button className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="space-y-4 p-5">
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
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <button className="flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50" disabled={isSaving || !canSave} onClick={() => onSave({
            targetType: draft.targetType,
            apiRequestId: draft.targetType === 'REQUEST' ? draft.apiRequestId : undefined,
            collectionId: draft.targetType === 'WORKFLOW' ? draft.collectionId : undefined,
            name: draft.name.trim(),
            scheduleType: draft.scheduleType,
            intervalMinutes: draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes : undefined,
            cronExpression: draft.scheduleType === 'CRON' ? draft.cronExpression.trim() : undefined,
            enabled: draft.enabled
          })}>
            <CheckCircle2 size={16} />{schedule ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, danger = false, label, onClick }: { children: React.ReactNode; danger?: boolean; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} title={label} className={`rounded-lg p-2 transition ${danger ? 'text-red-300 hover:bg-red-950/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`} onClick={onClick}>
      {children}
    </button>
  );
}

function MetricCard({ icon, label, tone = 'normal', value }: { icon: React.ReactNode; label: string; tone?: 'normal' | 'bad'; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <div className={`text-xl font-semibold ${tone === 'bad' ? 'text-red-300' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function calculateMetrics(executions: Execution[]) {
  const totalRuns = executions.length;
  const successfulRuns = executions.filter((execution) => execution.success).length;
  const failedRuns = totalRuns - successfulRuns;
  const avgLatencyMs = totalRuns === 0 ? 0 : executions.reduce((sum, execution) => sum + execution.responseTimeMs, 0) / totalRuns;
  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRate: totalRuns === 0 ? 0 : successfulRuns * 100 / totalRuns,
    failureRate: totalRuns === 0 ? 0 : failedRuns * 100 / totalRuns,
    avgLatencyMs
  };
}

function formatSchedule(schedule: Schedule) {
  if (schedule.scheduleType === 'INTERVAL') return `Every ${schedule.intervalMinutes} min`;
  return schedule.cronExpression ?? 'Cron';
}
