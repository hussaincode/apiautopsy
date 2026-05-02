import {
  Boxes,
  ChevronDown,
  Database,
  Folder,
  History,
  Import,
  Plus,
  Search,
  Settings,
  Timer,
  Workflow
} from 'lucide-react';
import { Input } from '../components/ui';
import type { ApiRequest, Collection, Workspace } from '../types/domain';
import type { AppPage } from './dashboardTypes';

export function Sidebar({
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
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = `${request.name} ${request.url}`.toLowerCase().includes(search.toLowerCase());
    const matchesCollection = selectedCollectionId === 'all' || request.collectionId === selectedCollectionId;
    return matchesSearch && matchesCollection;
  });

  return (
    <aside className="flex h-[calc(100vh-48px)] shrink-0 border-r border-[#e6e6e6] bg-white text-[#222]">
      <div className="flex w-[74px] flex-col items-center border-r border-[#e6e6e6] bg-[#fafafa] py-3">
        <RailButton active={activePage === 'requests'} icon={<Boxes size={21} />} label="Collections" onClick={() => onPage('requests')} />
        <RailButton icon={<Database size={21} />} label="Environments" onClick={() => onPage('settings')} />
        <RailButton active={activePage === 'scheduler'} icon={<Timer size={21} />} label="Scheduler" onClick={() => onPage('scheduler')} />
        <RailButton active={activePage === 'flows'} icon={<Workflow size={21} />} label="Flows" onClick={() => onPage('flows')} />
        <RailButton icon={<History size={21} />} label="History" onClick={() => onPage('requests')} />
        <div className="mt-auto">
          <RailButton active={activePage === 'settings'} icon={<Settings size={21} />} label="Settings" onClick={() => onPage('settings')} />
        </div>
      </div>

      <div className="flex w-[330px] flex-col bg-gradient-to-b from-[#fbfdff] to-[#f8fafc]">
        <div className="flex h-[58px] items-center justify-between border-b border-[#e6e6e6] px-4">
          <div className="min-w-0">
            <select className="max-w-[190px] appearance-none bg-transparent text-[15px] font-semibold text-[#2b2b2b] outline-none" value={workspaceId} onChange={(event) => onWorkspace(event.target.value)}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
            <ChevronDown className="ml-1 inline text-[#777]" size={15} />
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-[#f1f1f1] px-3 py-2 text-sm font-semibold text-[#333] hover:bg-[#e9e9e9]" onClick={onNewRequest}>New</button>
            <label className="flex cursor-pointer items-center gap-1 rounded bg-[#f1f1f1] px-3 py-2 text-sm font-semibold text-[#333] hover:bg-[#e9e9e9]">
              <Import size={14} />Import
              <input className="hidden" type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-[#eeeeee] p-3">
          <button className="rounded p-2 text-[#777] hover:bg-[#eeeeee]" onClick={onCreateCollection}><Plus size={18} /></button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-[#999]" size={16} />
            <Input className="h-9 w-full border-[#e8e8e8] bg-white pl-9 text-[#333] placeholder:text-[#aaa] focus:border-[#2563eb]" placeholder="Search collections" value={search} onChange={(event) => onSearch(event.target.value)} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          <button className={`mb-2 flex w-full items-center justify-between rounded px-2 py-2 text-left text-[15px] ${selectedCollectionId === 'all' ? 'bg-[#f0f0f0] text-[#222]' : 'text-[#4a4a4a] hover:bg-[#f3f3f3]'}`} onClick={() => onSelectCollection('all')}>
            <span className="flex items-center gap-2"><ChevronDown size={16} />All Collections</span>
            <span className="text-xs text-[#999]">{requests.length}</span>
          </button>

          <div className="space-y-1">
            {collections.map((collection) => {
              const childRequests = filteredRequests.filter((request) => request.collectionId === collection.id);
              const selected = selectedCollectionId === collection.id;
              return (
                <div key={collection.id}>
                  <button className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-[15px] ${selected ? 'bg-[#f0f0f0] text-[#222]' : 'text-[#454545] hover:bg-[#f3f3f3]'}`} onClick={() => onSelectCollection(collection.id)}>
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronDown className={selected ? '' : '-rotate-90'} size={15} />
                      <Folder size={16} />
                      <span className="truncate">{collection.name}</span>
                    </span>
                    <span className="text-xs text-[#999]">{childRequests.length}</span>
                  </button>
                  {selected && (
                    <div className="ml-7 mt-1 space-y-1">
                      {childRequests.map((request) => <RequestItem key={request.id} request={request} selected={selectedRequestId === request.id} onClick={() => onSelectRequest(request.id)} />)}
                      {childRequests.length === 0 && <div className="px-2 py-2 text-xs text-[#999]">No APIs in this collection</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#ededed] pt-3">
            <div className="mb-2 px-2 text-xs font-semibold uppercase text-[#aaa]">Unfiled</div>
            <div className="space-y-1">
              {filteredRequests.filter((request) => !request.collectionId).map((request) => <RequestItem key={request.id} request={request} selected={selectedRequestId === request.id} onClick={() => onSelectRequest(request.id)} />)}
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}

function RailButton({ active = false, icon, label, onClick }: { active?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`mb-2 flex w-[64px] flex-col items-center gap-1 rounded-md px-1 py-3 text-[11px] ${active ? 'bg-[#ededed] text-[#222]' : 'text-[#666] hover:bg-[#f0f0f0]'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function RequestItem({ request, selected, onClick }: { request: ApiRequest; selected: boolean; onClick: () => void }) {
  return (
    <button className={`w-full rounded px-2 py-2 text-left ${selected ? 'bg-[#eff6ff] text-[#1f1f1f]' : 'text-[#555] hover:bg-[#f3f3f3]'}`} onClick={onClick}>
      <div className="flex items-center gap-2">
        <span className="w-12 text-[11px] font-bold text-[#2563eb]">{request.method}</span>
        <span className="truncate text-sm">{request.name}</span>
      </div>
      <div className="mt-0.5 truncate pl-14 text-xs text-[#999]">{request.url}</div>
    </button>
  );
}
