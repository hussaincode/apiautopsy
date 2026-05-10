import {
  Boxes,
  ChevronDown,
  Database,
  Folder,
  History,
  Import,
  Activity,
  Plus,
  Search,
  Settings,
  Timer,
  Workflow
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '../components/ui';
import type { ApiRequest, Collection, Workspace } from '../types/domain';
import type { AppPage } from './dashboardTypes';

export function Sidebar({
  className = '',
  activePage,
  collections,
  requests,
  search,
  selectedCollectionId,
  selectedRequestId,
  workspaceId,
  workspaces,
  onCreateCollection,
  onImport,
  onNewRequest,
  onPage,
  onSearch,
  onSelectCollection,
  onSelectRequest,
  onWorkspace
}: {
  className?: string;
  activePage: AppPage;
  collections: Collection[];
  requests: ApiRequest[];
  search: string;
  selectedCollectionId: string;
  selectedRequestId?: string;
  userEmail?: string | null;
  workspaceId?: string;
  workspaces: Workspace[];
  onCreateCollection: () => void;
  onImport: (file: File) => void;
  onNewRequest: () => void;
  onPage: (page: AppPage) => void;
  onSearch: (value: string) => void;
  onSelectCollection: (id: string) => void;
  onSelectRequest: (id: string) => void;
  onWorkspace: (id: string) => void;
  onLogout: () => void;
}) {
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedCollectionId && selectedCollectionId !== 'all') {
      setExpandedCollectionIds((current) => new Set(current).add(selectedCollectionId));
    }
  }, [selectedCollectionId]);

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = `${request.name} ${request.url}`.toLowerCase().includes(search.toLowerCase());
    const matchesCollection = selectedCollectionId === 'all' || request.collectionId === selectedCollectionId;
    return matchesSearch && matchesCollection;
  });
  const unfiledRequests = filteredRequests.filter((request) => !request.collectionId);

  function toggleCollection(collectionId: string) {
    onSelectCollection(collectionId);
    setExpandedCollectionIds((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  }

  return (
    <aside className={`h-[calc(100vh-48px)] shrink-0 border-r border-slate-800 bg-[#0c0c0c] text-slate-100 ${className || 'flex'}`}>
      <div className="flex w-[74px] flex-col items-center border-r border-slate-800 bg-[#111827] py-3">
        <RailButton active={activePage === 'requests'} icon={<Boxes size={21} />} label="Collections" onClick={() => onPage('requests')} />
        <RailButton icon={<Database size={21} />} label="Environments" onClick={() => onPage('settings')} />
        <RailButton active={activePage === 'monitoring'} icon={<Activity size={21} />} label="Monitoring" onClick={() => onPage('monitoring')} />
        <RailButton active={activePage === 'scheduler'} icon={<Timer size={21} />} label="Scheduler" onClick={() => onPage('scheduler')} />
        <RailButton active={activePage === 'flows'} icon={<Workflow size={21} />} label="Flows" onClick={() => onPage('flows')} />
        <RailButton icon={<History size={21} />} label="History" onClick={() => onPage('requests')} />
        <div className="mt-auto">
          <RailButton active={activePage === 'settings'} icon={<Settings size={21} />} label="Settings" onClick={() => onPage('settings')} />
        </div>
      </div>

      <div className="flex w-[calc(100vw-74px)] max-w-[390px] flex-col bg-[#111827] md:w-[330px]">
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="flex min-w-0 items-center">
            <select className="min-w-0 max-w-full flex-1 appearance-none truncate bg-transparent pr-6 text-[15px] font-semibold text-slate-100 outline-none" value={workspaceId} onChange={(event) => onWorkspace(event.target.value)}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
            <ChevronDown className="-ml-5 shrink-0 text-slate-500" size={15} />
          </div>
          <div className="mt-3 grid grid-cols-[88px_1fr] gap-2">
            <button className="rounded-xl bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400" onClick={onNewRequest}>New</button>
            <label className="flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
              <Import size={14} />Import
              <input className="hidden" type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-800 p-3">
          <button className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100" onClick={onCreateCollection}><Plus size={18} /></button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <Input className="h-9 w-full rounded-xl border-slate-700 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500" placeholder="Search collections" value={search} onChange={(event) => onSearch(event.target.value)} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <button className={`mb-2 flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-[15px] transition ${selectedCollectionId === 'all' ? 'bg-slate-900 text-slate-100' : 'text-slate-300 hover:bg-slate-900'}`} onClick={() => {
            onSelectCollection('all');
            setAllExpanded((expanded) => !expanded);
          }}>
            <span className="flex items-center gap-2"><ChevronDown className={allExpanded ? '' : '-rotate-90'} size={16} />All Collections</span>
            <span className="text-xs text-slate-500">{collections.length}</span>
          </button>

          {allExpanded && <div className="space-y-1">
            {collections.map((collection) => {
              const childRequests = requests.filter((request) => request.collectionId === collection.id && `${request.name} ${request.url}`.toLowerCase().includes(search.toLowerCase()));
              const selected = selectedCollectionId === collection.id;
              const expanded = expandedCollectionIds.has(collection.id);
              return (
                <div key={collection.id}>
                  <button className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-[15px] transition ${selected ? 'bg-slate-900 text-slate-100' : 'text-slate-300 hover:bg-slate-900'}`} onClick={() => toggleCollection(collection.id)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown className={expanded ? '' : '-rotate-90'} size={15} />
                      <Folder size={16} />
                      <span className="truncate">{collection.name}</span>
                    </span>
                    <span className="text-xs text-slate-500">{childRequests.length}</span>
                  </button>
                  {expanded && (
                    <div className="ml-7 mt-1 space-y-1">
                      {childRequests.map((request) => <RequestItem key={request.id} request={request} selected={selectedRequestId === request.id} onClick={() => onSelectRequest(request.id)} />)}
                      {childRequests.length === 0 && <div className="px-2 py-2 text-xs text-slate-500">No APIs in this collection</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

          <div className="mt-4 border-t border-slate-800 pt-3">
            <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase text-slate-500">
              <span>Unfiled</span>
              <span>{unfiledRequests.length}</span>
            </div>
            <div className="space-y-1">
              {unfiledRequests.map((request) => <RequestItem key={request.id} request={request} selected={selectedRequestId === request.id} onClick={() => onSelectRequest(request.id)} />)}
              {unfiledRequests.length === 0 && <div className="px-2 py-2 text-xs text-slate-500">No unfiled APIs</div>}
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}

function RailButton({ active = false, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`mb-2 flex w-[64px] flex-col items-center gap-1 rounded-xl px-1 py-3 text-[11px] transition ${active ? 'bg-slate-900 text-slate-100' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RequestItem({ request, selected, onClick }: { request: ApiRequest; selected: boolean; onClick: () => void }) {
  return (
    <button className={`w-full rounded-xl px-2 py-2 text-left transition ${selected ? 'bg-indigo-500/15 text-slate-100 ring-1 ring-indigo-500/30' : 'text-slate-300 hover:bg-slate-900'}`} onClick={onClick}>
      <div className="flex items-center gap-2">
        <span className="w-12 text-[11px] font-bold text-teal-300">{request.method}</span>
        <span className="truncate text-sm">{request.name}</span>
      </div>
      <div className="mt-0.5 truncate pl-14 text-xs text-slate-500">{request.url}</div>
    </button>
  );
}
