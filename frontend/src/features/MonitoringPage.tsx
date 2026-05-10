import { Activity, BarChart3, CheckCircle2, ExternalLink, Filter, Timer, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/ui';
import type { ApiRequest, Collection, Execution, Schedule } from '../types/domain';
import { buildMonitorRows, filterMonitorRows, type MonitorFilters, type MonitorResultPoint, type MonitorResultState, type MonitorRow } from './monitoringMetrics';

const defaultFilters: MonitorFilters = {
  maxLatencyMs: '',
  maxSlowPercent: '',
  minAvailability: '',
  minQuality: '',
  name: ''
};

export function MonitoringPage({ collections, executions, requests, schedules, onOpenScheduler }: { collections: Collection[]; executions: Execution[]; requests: ApiRequest[]; schedules: Schedule[]; onOpenScheduler: () => void }) {
  const rows = useMemo(() => buildMonitorRows(schedules, executions, requests, collections), [collections, executions, requests, schedules]);
  const [selectedId, setSelectedId] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MonitorFilters>(defaultFilters);
  const filteredRows = useMemo(() => filterMonitorRows(rows, filters), [filters, rows]);
  const selected = filteredRows.find((row) => row.schedule.id === selectedId) ?? filteredRows[0] ?? rows[0];

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-[#0c0c0c] p-5 text-slate-100">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Monitoring</p>
          <h1 className="mt-1 text-2xl font-bold">Monitors in schedules</h1>
          <p className="mt-1 text-sm text-slate-400">Track pass/fail, availability, slow checks, and latency from real scheduled API executions.</p>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400" onClick={() => setFiltersOpen((open) => !open)}>
            <Filter size={16} />Filter
          </button>
          {filtersOpen && <MonitorFilterDropdown filters={filters} onChange={setFilters} onClose={() => setFiltersOpen(false)} onReset={() => setFilters(defaultFilters)} />}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
          <EmptyState title="No monitors yet" body="Create a schedule from a saved API request to start collecting pass/fail, availability, and latency history." />
          <button className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400" onClick={onOpenScheduler}>Create schedule</button>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,500px)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
            <div className="border-b border-slate-800 bg-slate-800/70 px-4 py-3">
              <div className="grid gap-3 text-xs font-semibold uppercase tracking-wide text-sky-300 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_minmax(300px,0.9fr)]">
                <span>Monitor</span>
                <span>Hourly results</span>
                <span>Health metrics</span>
              </div>
            </div>
            <div className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <MonitorTableRow key={row.schedule.id} active={selected?.schedule.id === row.schedule.id} row={row} onClick={() => setSelectedId(row.schedule.id)} />
              ))}
              {filteredRows.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-500">No monitors match these filters.</div>
              )}
            </div>
          </section>

          <MonitorDetail row={selected} />
        </div>
      )}
    </div>
  );
}

function MonitorTableRow({ active, row, onClick }: { active: boolean; row: MonitorRow; onClick: () => void }) {
  const title = row.request?.name ?? row.collectionName ?? row.schedule.name;
  const subtitle = row.request ? `${row.request.method} ${row.request.url}` : row.collectionName ? 'Workflow monitor' : 'Scheduled monitor';

  return (
    <button className={`grid w-full gap-4 px-4 py-4 text-left text-sm transition lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_minmax(300px,0.9fr)] ${active ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/60' : 'hover:bg-slate-900/70'}`} onClick={onClick}>
      <div className="flex min-w-0 items-start gap-3">
        <ExternalLink size={16} className="mt-1 shrink-0 text-sky-300" />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-slate-100">{title}</div>
          <div className="mt-1 truncate text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>
      <div className="min-w-0">
        <ResultBars results={row.hourlyResults} />
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          <span>Recent</span>
          <ResultBars results={row.recentResults} compact />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 min-[1500px]:grid-cols-4">
        <MetricChip label="Quality" value={row.totalRuns ? `${row.qualityScore.toFixed(0)}%` : '-'} />
        <MetricChip label="Availability" value={row.totalRuns ? `${row.availability.toFixed(1)}%` : '-'} />
        <MetricChip label="Slow" value={row.totalRuns ? `${row.slowPercent.toFixed(1)}%` : '-'} tone={row.slowPercent > 0 ? 'bad' : 'normal'} />
        <MetricChip label="Avg latency" value={row.totalRuns ? `${row.avgLatencyMs.toFixed(0)} ms` : '-'} />
      </div>
    </button>
  );
}

function MonitorDetail({ row }: { row?: MonitorRow }) {
  if (!row) {
    return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-6"><EmptyState title="Select a monitor" body="Choose a monitor to inspect pass/fail history and latency." /></section>;
  }

  const title = row.request?.name ?? row.collectionName ?? row.schedule.name;
  const subtitle = row.request ? `${row.request.method} ${row.request.url}` : row.collectionName ? `Workflow: ${row.collectionName}` : row.schedule.name;
  const latest = row.executions[0];
  const latencyMax = Math.max(row.avgLatencyMs, row.p95LatencyMs, row.schedule.sloLatencyP95Ms, 1);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
      <div className="border-b border-slate-800 bg-slate-900/45 p-5">
        <div className="inline-flex rounded-md bg-sky-400/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-sky-300">Monitor detail</div>
        <h2 className="mt-3 break-words text-2xl font-bold leading-tight text-slate-50">{title}</h2>
        <p className="mt-2 break-all text-sm leading-6 text-slate-400">{subtitle}</p>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <MetricCard icon={<Activity size={16} />} label="Total checks" value={row.totalRuns} />
        <MetricCard icon={<CheckCircle2 size={16} />} label="Passed" value={`${row.availability.toFixed(1)}%`} tone={row.availability < row.schedule.sloUptimeTarget ? 'bad' : 'normal'} />
        <MetricCard icon={<XCircle size={16} />} label="Failed" value={row.failedRuns} tone={row.failedRuns ? 'bad' : 'normal'} />
        <MetricCard icon={<Timer size={16} />} label="Slow checks" value={`${row.slowPercent.toFixed(1)}%`} tone={row.slowPercent > 0 ? 'bad' : 'normal'} />
      </div>

      <div className="space-y-5 p-5 pt-0">
        <Panel title="Daily status">
          <div className="flex flex-wrap gap-2">
            {row.dailyStatus.map((day) => (
              <div key={day.date} className="group relative">
                <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg text-xs font-semibold transition group-hover:-translate-y-0.5 ${stateClass(day.state)}`}>
                <span>{formatDay(day.date)}</span>
                </div>
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-center text-[11px] font-semibold leading-4 text-slate-100 shadow-xl shadow-black/50 group-hover:block">
                  {day.date}. {dailyTooltip(day.state)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Latency summary">
          <LatencyBar label="Average" value={row.avgLatencyMs} max={latencyMax} />
          <LatencyBar label="P95" value={row.p95LatencyMs} max={latencyMax} />
          <LatencyBar label="Target" value={row.schedule.sloLatencyP95Ms} max={latencyMax} />
          <p className="mt-3 text-xs leading-5 text-slate-500">These are measured total response times from APIAutopsy executions. DNS/connect/TLS phase timings require backend timing instrumentation before they can be shown honestly.</p>
        </Panel>

        <Panel title="Recent pass/fail details">
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[1fr_90px_90px] bg-slate-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Run</span><span>Status</span><span>Latency</span>
            </div>
            {(row.executions.slice(0, 8)).map((execution) => (
              <div key={execution.id} className="grid grid-cols-[1fr_90px_90px] items-center border-t border-slate-800 px-3 py-2 text-sm">
                <span className="truncate text-slate-300">{formatDateTime(execution.executedAt)}</span>
                <span className={execution.success ? 'font-semibold text-teal-300' : 'font-semibold text-red-300'}>{execution.success ? 'Pass' : 'Fail'}</span>
                <span className="text-slate-300">{execution.responseTimeMs} ms</span>
              </div>
            ))}
            {!latest && <div className="px-3 py-5 text-center text-sm text-slate-500">No checks have run yet.</div>}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function MonitorFilterDropdown({ filters, onChange, onClose, onReset }: { filters: MonitorFilters; onChange: (filters: MonitorFilters) => void; onClose: () => void; onReset: () => void }) {
  function update(key: keyof MonitorFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="absolute right-0 top-12 z-30 w-[min(92vw,390px)] rounded-2xl border border-slate-700 bg-[#111827] p-4 shadow-2xl shadow-black/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Filter monitors</div>
          <div className="text-xs text-slate-500">Use one dropdown for all monitor filters.</div>
        </div>
        <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white" onClick={onClose}>Close</button>
      </div>
      <div className="grid gap-3">
        <FilterInput label="Name or URL" placeholder="Filter monitor..." value={filters.name} onChange={(value) => update('name', value)} />
        <FilterInput label="Min quality" placeholder="90" value={filters.minQuality} onChange={(value) => update('minQuality', value)} />
        <FilterInput label="Min availability" placeholder="99" value={filters.minAvailability} onChange={(value) => update('minAvailability', value)} />
        <FilterInput label="Max slow %" placeholder="5" value={filters.maxSlowPercent} onChange={(value) => update('maxSlowPercent', value)} />
        <FilterInput label="Max avg latency" placeholder="500" value={filters.maxLatencyMs} onChange={(value) => update('maxLatencyMs', value)} />
        <button className="h-11 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-400 hover:text-white" onClick={onReset}>Reset filters</button>
      </div>
    </div>
  );
}

function FilterInput({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder: string; value: string }) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400"
        inputMode={label === 'Name or URL' ? 'text' : 'decimal'}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MetricChip({ label, tone = 'normal', value }: { label: string; tone?: 'normal' | 'bad'; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 whitespace-nowrap text-sm font-bold ${tone === 'bad' ? 'text-red-300' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function ResultBars({ compact = false, results }: { compact?: boolean; results: MonitorResultPoint[] }) {
  const values = results.length ? results : Array.from({ length: compact ? 5 : 24 }, () => ({ state: 'empty' as const }));
  return (
    <div className="flex h-9 items-end gap-1">
      {values.map((result, index) => (
        <span key={`${result.state}-${index}`} className="group relative inline-flex">
          <span className={`w-2 rounded-sm transition group-hover:scale-y-110 ${barClass(result.state)} ${compact ? 'h-4' : 'h-7'}`} />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-center text-[11px] font-semibold leading-4 text-slate-100 shadow-xl shadow-black/50 group-hover:block">
            {resultTooltip(result)}
          </span>
        </span>
      ))}
    </div>
  );
}

function MetricCard({ icon, label, tone = 'normal', value }: { icon: React.ReactNode; label: string; tone?: 'normal' | 'bad'; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <div className={`text-2xl font-bold ${tone === 'bad' ? 'text-red-300' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-300"><BarChart3 size={16} />{title}</h3>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">{children}</div>
    </div>
  );
}

function LatencyBar({ label, max, value }: { label: string; max: number; value: number }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value.toFixed(0)} ms</span></div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.min(100, Math.max(4, value * 100 / max))}%` }} />
      </div>
    </div>
  );
}

function barClass(state: MonitorResultState) {
  if (state === 'pass') return 'bg-emerald-400';
  if (state === 'slow') return 'bg-amber-300';
  if (state === 'fail') return 'bg-red-400';
  return 'bg-slate-700';
}

function resultTooltip(result: MonitorResultPoint) {
  if (!result.executedAt) return 'No check ran for this slot.';
  const status = result.state === 'pass' ? 'PASS' : result.state === 'slow' ? 'SLOW PASS' : 'FAIL';
  const latency = result.latencyMs === undefined ? '' : ` in ${result.latencyMs} ms`;
  const code = result.statusCode === undefined ? '' : `, HTTP ${result.statusCode}`;
  return `${formatDateTime(result.executedAt)}. API call: ${status}${latency}${code}.`;
}

function dailyTooltip(state: MonitorResultState) {
  if (state === 'pass') return 'There have been only passes during this day.';
  if (state === 'slow') return 'There have been slow responses during this day.';
  if (state === 'fail') return 'There have been failures and passes during this day.';
  return 'No checks ran during this day.';
}

function stateClass(state: MonitorResultState) {
  if (state === 'pass') return 'bg-emerald-500 text-white';
  if (state === 'slow') return 'bg-amber-300 text-slate-950';
  if (state === 'fail') return 'bg-red-500 text-white';
  return 'bg-slate-800 text-slate-500';
}

function formatDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' }).format(date);
}
