import { Activity, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { usePublicStatus } from '../api/hooks';

export function PublicStatusPage({ slug }: { slug: string }) {
  const status = usePublicStatus(slug);
  const data = status.data;
  const tone = data?.status === 'OPERATIONAL' ? 'text-teal-300' : data?.status === 'DEGRADED' ? 'text-amber-300' : 'text-red-300';

  return (
    <main className="min-h-screen bg-[#0c0c0c] px-5 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400 text-slate-950">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">APIAutopsy Status</h1>
            <p className="text-sm text-slate-500">Single-region synthetic monitor</p>
          </div>
        </div>

        {status.isLoading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Loading status...</div>}
        {status.isError && <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">This status page is not available.</div>}

        {data && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/20">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{data.method} {data.url}</p>
                  <h2 className="mt-2 text-3xl font-bold">{data.name}</h2>
                </div>
                <div className={`rounded-full bg-slate-950 px-4 py-2 text-sm font-bold ${tone}`}>{data.status}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Metric icon={<CheckCircle2 size={17} />} label="Success rate" value={`${data.successRate.toFixed(1)}%`} />
              <Metric icon={<Clock3 size={17} />} label="Avg latency" value={`${data.avgLatencyMs.toFixed(0)} ms`} />
              <Metric icon={<Activity size={17} />} label="P95 latency" value={`${data.p95LatencyMs.toFixed(0)} ms`} />
              <Metric icon={<XCircle size={17} />} label="Runs sampled" value={data.totalRuns} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4 font-semibold">Recent checks</div>
              {data.recentExecutions.map((execution) => (
                <div key={`${execution.executedAt}-${execution.responseTimeMs}`} className="grid grid-cols-[minmax(0,1.4fr)_90px_90px_80px] gap-3 border-b border-slate-800 px-5 py-3 text-sm last:border-b-0">
                  <div className="truncate text-slate-300">{new Date(execution.executedAt).toLocaleString()}</div>
                  <div className={execution.success ? 'font-semibold text-teal-300' : 'font-semibold text-red-300'}>{execution.success ? 'Success' : 'Failed'}</div>
                  <div>{execution.responseTimeMs} ms</div>
                  <div className="text-slate-400">{execution.statusCode ?? 'N/A'}</div>
                </div>
              ))}
              {data.recentExecutions.length === 0 && <div className="px-5 py-8 text-center text-slate-500">No public checks recorded yet.</div>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">{icon}{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
