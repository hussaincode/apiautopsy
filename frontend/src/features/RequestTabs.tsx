import { Plus, X } from 'lucide-react';
import type { ApiRequest } from '../types/domain';

export function RequestTabs({ openIds, requests, selectedId, onClose, onNew, onSelect }: {
  openIds: string[];
  requests: ApiRequest[];
  selectedId?: string;
  onClose: (id: string) => void;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  const openRequests = openIds.map((id) => requests.find((request) => request.id === id)).filter(Boolean) as ApiRequest[];

  return (
    <div className="flex h-[58px] items-end border-b border-slate-800 bg-[#111827] px-3">
      {openRequests.length === 0 && (
        <button className="flex h-[42px] items-center gap-2 border-b-2 border-indigo-400 px-4 text-sm font-medium text-slate-100">
          Overview
        </button>
      )}
      {openRequests.map((request) => (
        <button key={request.id} className={`group flex h-[42px] max-w-64 items-center gap-2 border-b-2 px-4 text-sm transition ${selectedId === request.id ? 'border-indigo-400 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`} onClick={() => onSelect(request.id)}>
          <span className="text-xs font-bold text-teal-300">{request.method}</span>
          <span className="truncate">{request.name}</span>
          <span className="rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-100" onClick={(event) => { event.stopPropagation(); onClose(request.id); }}><X size={14} /></span>
        </button>
      ))}
      <button className="mb-2 ml-2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100" onClick={onNew}><Plus size={17} /></button>
    </div>
  );
}
