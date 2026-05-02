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
    <div className="bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ResponseMetric icon={<Server size={16} />} label="Status" value={isLoading ? 'Pending' : execution?.statusCode ?? 'Error'} tone={execution?.success ? 'good' : execution ? 'bad' : 'neutral'} />
        <ResponseMetric icon={<Clock size={16} />} label="Time" value={isLoading ? '...' : `${execution?.responseTimeMs ?? 0} ms`} />
        <ResponseMetric icon={<FileJson size={16} />} label="Result" value={isLoading ? 'Sending' : execution?.success ? 'Success' : 'Failed'} tone={execution?.success ? 'good' : execution ? 'bad' : 'neutral'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="min-h-72 overflow-hidden rounded border border-[#e6e6e6] bg-[#fbfbfb]">
          <div className="border-b border-[#e6e6e6] px-4 py-3 text-sm font-semibold text-[#333]">Body</div>
          <pre className="max-h-[420px] overflow-auto p-4 text-sm leading-6 text-[#333]">{isLoading ? 'Waiting for response...' : execution?.responseBody ?? execution?.errorMessage ?? ''}</pre>
        </section>
        <section className="overflow-hidden rounded border border-[#e6e6e6] bg-[#fbfbfb]">
          <div className="border-b border-[#e6e6e6] px-4 py-3 text-sm font-semibold text-[#333]">Headers</div>
          <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-5 text-[#555]">{execution ? JSON.stringify(execution.responseHeaders ?? {}, null, 2) : '{}'}</pre>
        </section>
      </div>
    </div>
  );
}

function ResponseMetric({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'good' | 'bad' | 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-[#12805c]' : tone === 'bad' ? 'text-[#c7352b]' : 'text-[#333]';
  return (
    <div className="min-w-36 rounded border border-[#e6e6e6] bg-[#fbfbfb] px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase text-[#999]">{icon}{label}</div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
