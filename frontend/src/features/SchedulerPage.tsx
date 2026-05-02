import { CalendarClock, CheckCircle2, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, EmptyState, FieldLabel, Input, Select } from '../components/ui';
import type { ApiRequest, Execution, Schedule, ScheduleType } from '../types/domain';

export function SchedulerPage({
  executions,
  isCreating,
  requests,
  schedules,
  onCreateSchedule,
  onToggleSchedule
}: {
  executions: Execution[];
  isCreating: boolean;
  requests: ApiRequest[];
  schedules: Schedule[];
  onCreateSchedule: (payload: { apiRequestId: string; name: string; scheduleType: ScheduleType; intervalMinutes?: number; cronExpression?: string; enabled: boolean }) => void;
  onToggleSchedule: (schedule: Schedule) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState({
    apiRequestId: requests[0]?.id ?? '',
    name: 'Production health check',
    scheduleType: 'INTERVAL' as ScheduleType,
    intervalMinutes: 5,
    cronExpression: '0 */5 * * * *',
    enabled: true
  });

  const requestById = useMemo(() => new Map(requests.map((request) => [request.id, request])), [requests]);

  function create() {
    const apiRequestId = draft.apiRequestId || requests[0]?.id;
    if (!apiRequestId) return;
    onCreateSchedule({
      apiRequestId,
      name: draft.name,
      scheduleType: draft.scheduleType,
      intervalMinutes: draft.scheduleType === 'INTERVAL' ? draft.intervalMinutes : undefined,
      cronExpression: draft.scheduleType === 'CRON' ? draft.cronExpression : undefined,
      enabled: draft.enabled
    });
    setModalOpen(false);
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-white p-6 text-[#222]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Scheduler</h1>
          <p className="mt-1 text-sm text-[#777]">Scheduled API monitoring lives here, away from the request testing workspace.</p>
        </div>
        <button className="flex h-10 items-center gap-2 rounded bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]" onClick={() => setModalOpen(true)}><Plus size={16} />Create Schedule</button>
      </div>

      <section className="overflow-hidden rounded border border-[#e6e6e6] bg-white">
        <div className="grid grid-cols-[1.3fr_1fr_120px_170px_120px] border-b border-[#e6e6e6] bg-[#fafafa] px-4 py-3 text-xs font-semibold uppercase text-[#888]">
          <div>API name</div>
          <div>Schedule</div>
          <div>Status</div>
          <div>Last run</div>
          <div>Success rate</div>
        </div>
        {schedules.map((schedule) => {
          const request = requestById.get(schedule.apiRequestId);
          const related = executions.filter((execution) => execution.apiRequestId === schedule.apiRequestId);
          const successRate = related.length === 0 ? 'N/A' : `${((related.filter((execution) => execution.success).length / related.length) * 100).toFixed(0)}%`;
          return (
            <div key={schedule.id} className="grid grid-cols-[1.3fr_1fr_120px_170px_120px] items-center border-b border-[#eeeeee] px-4 py-4 text-sm last:border-b-0">
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#333]">{request?.name ?? 'Unknown API'}</div>
                <div className="truncate text-xs text-[#999]">{request?.method} {request?.url}</div>
              </div>
              <div className="text-[#555]">{schedule.scheduleType === 'INTERVAL' ? `Every ${schedule.intervalMinutes} minutes` : schedule.cronExpression}</div>
              <button onClick={() => onToggleSchedule(schedule)} className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${schedule.enabled ? 'bg-[#e8f7ef] text-[#12805c]' : 'bg-[#eeeeee] text-[#777]'}`}>{schedule.enabled ? 'ON' : 'OFF'}</button>
              <div className="text-[#777]">{schedule.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Never'}</div>
              <div className="font-semibold text-[#333]">{successRate}</div>
            </div>
          );
        })}
        {schedules.length === 0 && <div className="p-6"><EmptyState title="No schedules yet" body="Create a schedule from a saved API. Choose simple intervals first; cron is available for advanced users." /></div>}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded border border-[#dddddd] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e6e6e6] px-5 py-4">
              <div className="flex items-center gap-2 font-semibold text-[#222]"><CalendarClock size={18} />Create Schedule</div>
              <button className="rounded p-1 text-[#777] hover:bg-[#f1f1f1]" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <FieldLabel>Select API</FieldLabel>
                <Select className="w-full border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.apiRequestId || requests[0]?.id} onChange={(event) => setDraft({ ...draft, apiRequestId: event.target.value })}>
                  {requests.map((request) => <option key={request.id} value={request.id}>{request.name}</option>)}
                </Select>
              </label>
              <label className="block">
                <FieldLabel>Schedule name</FieldLabel>
                <Input className="w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb]" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="block">
                <FieldLabel>Schedule type</FieldLabel>
                <Select className="w-full border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.scheduleType} onChange={(event) => setDraft({ ...draft, scheduleType: event.target.value as ScheduleType })}>
                  <option value="INTERVAL">Simple interval</option>
                  <option value="CRON">Advanced cron</option>
                </Select>
              </label>
              {draft.scheduleType === 'INTERVAL' ? (
                <label className="block">
                  <FieldLabel>Run every</FieldLabel>
                  <Select className="w-full border-[#dcdcdc] bg-[#fafafa] text-[#333] focus:border-[#2563eb]" value={draft.intervalMinutes} onChange={(event) => setDraft({ ...draft, intervalMinutes: Number(event.target.value) })}>
                    <option value={1}>1 minute</option>
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </Select>
                </label>
              ) : (
                <label className="block">
                  <FieldLabel>Cron expression</FieldLabel>
                  <Input className="w-full border-[#dcdcdc] bg-white font-mono text-[#333] focus:border-[#2563eb]" value={draft.cronExpression} onChange={(event) => setDraft({ ...draft, cronExpression: event.target.value })} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-[#555]">
                <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
                Enable schedule immediately
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e6e6e6] px-5 py-4">
              <Button className="bg-white text-[#555] hover:bg-[#f4f4f4]" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <button className="flex h-10 items-center gap-2 rounded bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50" disabled={isCreating || requests.length === 0} onClick={create}><CheckCircle2 size={16} />Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
