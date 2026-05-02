import { Clock, FileJson, Server } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '../components/ui';
import type { Execution } from '../types/domain';

export function ResponseViewer({ execution, isLoading }: { execution?: Execution; isLoading: boolean }) {
  if (!execution && !isLoading) {
    return (
      <div className="p-5">
        <EmptyState title="No response yet" body="Send a request to inspect status, time, response body, and headers." />
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0c] p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ResponseMetric icon={<Server size={16} />} label="Status" value={isLoading ? 'Pending' : execution?.statusCode ?? 'Error'} tone={execution?.success ? 'good' : execution ? 'bad' : 'neutral'} />
        <ResponseMetric icon={<Clock size={16} />} label="Time" value={isLoading ? '...' : `${execution?.responseTimeMs ?? 0} ms`} />
        <ResponseMetric icon={<FileJson size={16} />} label="Result" value={isLoading ? 'Sending' : execution?.success ? 'Success' : 'Failed'} tone={execution?.success ? 'good' : execution ? 'bad' : 'neutral'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="min-h-72 overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">Body</div>
          <pre className="max-h-[420px] overflow-auto p-4 text-sm leading-6 text-slate-100">{isLoading ? 'Waiting for response...' : execution?.responseBody ?? execution?.errorMessage ?? ''}</pre>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-xl shadow-black/20">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">Headers</div>
          <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-5 text-slate-300">{execution ? JSON.stringify(execution.responseHeaders ?? {}, null, 2) : '{}'}</pre>
        </section>
      </div>
    </div>
  );
}

function ResponseMetric({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'good' | 'bad' | 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-teal-300' : tone === 'bad' ? 'text-red-300' : 'text-slate-100';
  return (
    <div className="min-w-36 rounded-2xl border border-slate-800 bg-[#111827] px-3 py-2 shadow-lg shadow-black/20">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase text-slate-500">{icon}{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
