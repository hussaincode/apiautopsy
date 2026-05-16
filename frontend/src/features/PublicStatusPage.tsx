import { CheckCircle2, Clock3, Gauge, MapPin, ShieldCheck, XCircle } from 'lucide-react';
import { usePublicStatus } from '../api/hooks';

export function PublicStatusPage({ slug }: { slug: string }) {
  const status = usePublicStatus(slug);
  const data = status.data;
  const tone = data?.status === 'OPERATIONAL' ? 'border-teal-400/30 bg-teal-400/10 text-teal-200' : data?.status === 'DEGRADED' ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-red-400/30 bg-red-400/10 text-red-200';
  const latestCheck = data?.recentExecutions[0]?.executedAt;

  return (
    <main className="h-screen overflow-y-auto overflow-x-hidden bg-[#0c0c0c] px-4 py-8 text-slate-100 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-5xl pb-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">APIAutopsy Status</h1>
            <p className="text-sm text-slate-500">Public API health page for clients and teams</p>
          </div>
        </div>

        {status.isLoading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading status...</div>}
        {status.isError && <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">This status page is not available.</div>}

        {data && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public status page</p>
                  <h2 className="mt-2 text-3xl font-bold">{data.name}</h2>
                  <p className="mt-2 break-all text-sm text-slate-400">{data.method} {data.url}</p>
                </div>
                <div className={`rounded-full border px-4 py-2 text-sm font-bold ${tone}`}>{formatStatus(data.status)}</div>
              </div>
              <div className="mt-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 text-indigo-300" size={16} />
                  <div>
                    <div className="font-semibold text-slate-100">Monitoring location</div>
                    <p className="mt-1 text-slate-500">Single-region APIAutopsy monitor. Multi-region checks can be added later.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 text-indigo-300" size={16} />
                  <div>
                    <div className="font-semibold text-slate-100">Last checked</div>
                    <p className="mt-1 text-slate-500">{latestCheck ? new Date(latestCheck).toLocaleString() : 'Waiting for the first scheduled check'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={<CheckCircle2 size={17} />} label="Healthy checks" value={`${data.successRate.toFixed(1)}%`} description="Scheduled runs that passed." />
              <Metric icon={<Clock3 size={17} />} label="Average response" value={`${data.avgLatencyMs.toFixed(0)} ms`} description="Mean response time." />
              <Metric icon={<Gauge size={17} />} label="Typical slowest response" value={`${data.p95LatencyMs.toFixed(0)} ms`} description="95% of checks were this fast or faster." />
              <Metric icon={<XCircle size={17} />} label="Checks sampled" value={data.totalRuns} description="Runs included in this report." />
            </div>

            <UptimeHistory
              name={data.name}
              recentExecutions={data.recentExecutions}
              successRate={data.successRate}
            />

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="font-semibold">Recent checks</div>
                <p className="mt-1 text-sm text-slate-500">Each row is one scheduled API call from APIAutopsy.</p>
              </div>
              <div className="max-h-[46vh] overflow-y-auto">
                {data.recentExecutions.map((execution) => (
                  <div key={`${execution.executedAt}-${execution.responseTimeMs}`} className="grid grid-cols-2 gap-3 border-b border-slate-800 px-5 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_100px_100px_80px]">
                    <div className="truncate text-slate-300">{new Date(execution.executedAt).toLocaleString()}</div>
                    <div className={execution.success ? 'font-semibold text-teal-300' : 'font-semibold text-red-300'}>{execution.success ? 'Success' : 'Failed'}</div>
                    <div>{execution.responseTimeMs} ms</div>
                    <div className="text-slate-400">{execution.statusCode ?? 'N/A'}</div>
                  </div>
                ))}
              </div>
              {data.recentExecutions.length === 0 && <div className="px-5 py-8 text-center text-slate-500">No public checks recorded yet.</div>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function UptimeHistory({ name, recentExecutions, successRate }: { name: string; recentExecutions: Array<{ executedAt: string; success: boolean }>; successRate: number }) {
  const days = buildUptimeDays(recentExecutions);
  const latestState = days[days.length - 1]?.state ?? 'unknown';

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Uptime over the past 90 days</h3>
          <p className="mt-1 text-sm text-slate-500">Daily health summary for this public monitor.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${latestState === 'down' ? 'bg-red-500/15 text-red-300' : latestState === 'degraded' ? 'bg-amber-500/15 text-amber-300' : 'bg-teal-500/15 text-teal-300'}`}>
          {latestState === 'down' ? 'Down' : latestState === 'degraded' ? 'Degraded' : 'Operational'}
        </span>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-100">{name}</div>
            <div className="text-xs text-slate-500">Public API</div>
          </div>
          <div className="text-sm font-semibold text-teal-300">{successRate.toFixed(2)}% uptime</div>
        </div>
        <div className="flex h-12 items-end gap-1 overflow-hidden">
          {days.map((day) => (
            <div
              key={day.isoDate}
              className={`h-10 min-w-1.5 flex-1 rounded-sm ${day.state === 'down' ? 'bg-red-400' : day.state === 'degraded' ? 'bg-amber-300' : day.state === 'unknown' ? 'bg-slate-700' : 'bg-teal-400'}`}
              title={`${day.label}: ${day.summary}`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span>90 days ago</span>
          <span className="h-px flex-1 bg-slate-700" />
          <span>{successRate.toFixed(2)}% uptime</span>
          <span className="h-px flex-1 bg-slate-700" />
          <span>Today</span>
        </div>
      </div>
    </section>
  );
}

function Metric({ description, icon, label, value }: { description: string; icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function buildUptimeDays(recentExecutions: Array<{ executedAt: string; success: boolean }>) {
  const byDay = new Map<string, { total: number; failed: number }>();
  for (const execution of recentExecutions) {
    const date = new Date(execution.executedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    const existing = byDay.get(key) ?? { total: 0, failed: 0 };
    existing.total += 1;
    if (!execution.success) existing.failed += 1;
    byDay.set(key, existing);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 90 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (89 - index));
    const isoDate = date.toISOString().slice(0, 10);
    const stats = byDay.get(isoDate);
    const state = !stats ? 'unknown' : stats.failed === 0 ? 'operational' : stats.failed === stats.total ? 'down' : 'degraded';
    return {
      isoDate,
      label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      state,
      summary: !stats ? 'No checks recorded' : stats.failed === 0 ? `${stats.total} checks passed` : `${stats.failed} of ${stats.total} checks failed`
    };
  });
}

function formatStatus(status: string) {
  if (status === 'OPERATIONAL') return 'Operational';
  if (status === 'DEGRADED') return 'Degraded';
  return 'Down';
}
