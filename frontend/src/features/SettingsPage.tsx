import { KeyRound, LockKeyhole, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { useCreateCertificate } from '../api/hooks';
import { Button, FieldLabel, Input } from '../components/ui';

export function SettingsPage({ workspaceId }: { workspaceId?: string }) {
  const createCertificate = useCreateCertificate(workspaceId);
  const [certificateName, setCertificateName] = useState('Production client certificate');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);
  const [savedMessage, setSavedMessage] = useState('');

  async function saveCertificate() {
    if (!certificateName.trim() || !certificateFile) return;
    const form = new FormData();
    form.append('name', certificateName.trim());
    form.append('certificate', certificateFile);
    if (privateKeyFile) form.append('privateKey', privateKeyFile);
    await createCertificate.mutateAsync(form);
    setSavedMessage('Certificate saved securely');
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-[#0c0c0c] p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Security, credentials, and workspace configuration stay separate from request testing.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><LockKeyhole size={18} />Security</div>
          <label className="mb-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300">
            SSL verification
            <input type="checkbox" defaultChecked />
          </label>
          <FieldLabel>Client certificate</FieldLabel>
          <Input className="mb-3 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" value={certificateName} onChange={(event) => setCertificateName(event.target.value)} />
          <FileUpload label="Certificate file" file={certificateFile} accept=".pem,.crt" onChange={setCertificateFile} />
          <FileUpload label="Private key file" file={privateKeyFile} accept=".pem,.key" optional onChange={setPrivateKeyFile} />
          <button className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50" disabled={createCertificate.isPending || !certificateFile} onClick={saveCertificate}><Upload size={16} />{createCertificate.isPending ? 'Uploading' : 'Save certificate'}</button>
          {savedMessage && <p className="mt-3 text-sm text-teal-300">{savedMessage}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><KeyRound size={18} />API Keys</div>
          <p className="text-sm leading-6 text-slate-400">API keys are managed inside each request’s Auth tab so they can be encrypted and scoped to the saved API.</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex items-center gap-2 font-semibold"><Users size={18} />Workspace</div>
          <FieldLabel>Workspace name</FieldLabel>
          <Input className="mb-3 w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100 focus:border-indigo-500" defaultValue="APIAutopsy Founder's Workspace" />
          <p className="text-sm leading-6 text-slate-400">Use the Invite button in the top bar to add workspace members. Invites are stored server-side.</p>
        </section>
      </div>
    </div>
  );
}

function FileUpload({ accept, file, label, optional = false, onChange }: { accept: string; file: File | null; label: string; optional?: boolean; onChange: (file: File | null) => void }) {
  return (
    <div className="mb-3">
      <FieldLabel>{label}{optional ? ' optional' : ''}</FieldLabel>
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 transition hover:border-indigo-500">
        <span className="truncate">{file ? file.name : `Upload ${accept}`}</span>
        <Upload size={16} className="text-slate-500" />
        <input className="hidden" type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
      </label>
      {file && <button className="mt-2 text-xs font-semibold text-red-300 hover:text-red-200" onClick={() => onChange(null)}>Remove file</button>}
    </div>
  );
}
