import { Plus, X } from 'lucide-react';
import type { ApiRequest } from '../types/domain';

export function RequestTabs({ openIds, requests, selectedId, onClose, onSelect }: {
  openIds: string[];
  requests: ApiRequest[];
  selectedId?: string;
  onClose: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const openRequests = openIds.map((id) => requests.find((request) => request.id === id)).filter(Boolean) as ApiRequest[];

  return (
    <div className="flex h-[58px] items-end border-b border-[#e6e6e6] bg-white px-3">
      {openRequests.length === 0 && (
        <button className="flex h-[42px] items-center gap-2 border-b-2 border-[#2563eb] px-4 text-sm font-medium text-[#333]">
          Overview
        </button>
      )}
      {openRequests.map((request) => (
        <button key={request.id} className={`group flex h-[42px] max-w-64 items-center gap-2 border-b-2 px-4 text-sm ${selectedId === request.id ? 'border-[#2563eb] text-[#222]' : 'border-transparent text-[#666] hover:bg-[#fafafa]'}`} onClick={() => onSelect(request.id)}>
          <span className="text-xs font-bold text-[#2563eb]">{request.method}</span>
          <span className="truncate">{request.name}</span>
          <span className="rounded p-0.5 text-[#999] hover:bg-[#eeeeee] hover:text-[#333]" onClick={(event) => { event.stopPropagation(); onClose(request.id); }}><X size={14} /></span>
        </button>
      ))}
      <button className="mb-2 ml-2 rounded p-2 text-[#777] hover:bg-[#f1f1f1]"><Plus size={17} /></button>
    </div>
  );
}
