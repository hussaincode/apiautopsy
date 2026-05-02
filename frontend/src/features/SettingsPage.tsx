import { KeyRound, LockKeyhole, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import { useCreateCertificate } from '../api/hooks';
import { Button, FieldLabel, Input } from '../components/ui';

export function SettingsPage({ workspaceId }: { workspaceId?: string }) {
  const createCertificate = useCreateCertificate(workspaceId);
  const [certificateName, setCertificateName] = useState('Production client certificate');
  const [certificatePem, setCertificatePem] = useState('');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  async function saveCertificate() {
    if (!certificateName.trim() || !certificatePem.trim()) return;
    await createCertificate.mutateAsync({ name: certificateName.trim(), certificatePem, privateKeyPem: privateKeyPem || undefined });
    setSavedMessage('Certificate saved securely');
  }

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto bg-white p-6 text-[#222]">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[#777]">Security, credentials, and workspace configuration stay separate from request testing.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded border border-[#e6e6e6] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold"><LockKeyhole size={18} />Security</div>
          <label className="mb-5 flex items-center justify-between rounded border border-[#eeeeee] bg-[#fafafa] px-3 py-3 text-sm text-[#444]">
            SSL verification
            <input type="checkbox" defaultChecked />
          </label>
          <FieldLabel>Client certificate</FieldLabel>
          <Input className="mb-3 w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb]" value={certificateName} onChange={(event) => setCertificateName(event.target.value)} />
          <textarea className="mb-3 h-28 w-full rounded border border-[#dcdcdc] bg-white p-3 font-mono text-xs text-[#333] outline-none focus:border-[#2563eb]" placeholder="-----BEGIN CERTIFICATE-----" value={certificatePem} onChange={(event) => setCertificatePem(event.target.value)} />
          <textarea className="mb-3 h-28 w-full rounded border border-[#dcdcdc] bg-white p-3 font-mono text-xs text-[#333] outline-none focus:border-[#2563eb]" placeholder="-----BEGIN PRIVATE KEY-----" value={privateKeyPem} onChange={(event) => setPrivateKeyPem(event.target.value)} />
          <button className="flex h-10 w-full items-center justify-center gap-2 rounded bg-[#2563eb] text-sm font-semibold text-white disabled:opacity-50" disabled={createCertificate.isPending || !certificatePem.trim()} onClick={saveCertificate}><Upload size={16} />Save certificate</button>
          {savedMessage && <p className="mt-3 text-sm text-[#0f766e]">{savedMessage}</p>}
        </section>

        <section className="rounded border border-[#e6e6e6] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold"><KeyRound size={18} />API Keys</div>
          <p className="text-sm leading-6 text-[#777]">API keys are managed inside each request’s Auth tab so they can be encrypted and scoped to the saved API.</p>
        </section>

        <section className="rounded border border-[#e6e6e6] bg-white p-5">
          <div className="mb-4 flex items-center gap-2 font-semibold"><Users size={18} />Workspace</div>
          <FieldLabel>Workspace name</FieldLabel>
          <Input className="mb-3 w-full border-[#dcdcdc] bg-white text-[#333] focus:border-[#2563eb]" defaultValue="APIAutopsy Founder's Workspace" />
          <p className="text-sm leading-6 text-[#777]">Use the Invite button in the top bar to add workspace members. Invites are stored server-side.</p>
        </section>
      </div>
    </div>
  );
}
