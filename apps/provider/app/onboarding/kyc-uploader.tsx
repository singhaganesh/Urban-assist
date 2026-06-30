'use client';
import * as React from 'react';
import { Button, Card, Field } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';

const TYPES: { value: string; label: string }[] = [
  { value: 'id', label: 'Photo ID' },
  { value: 'insurance', label: 'Insurance certificate' },
  { value: 'certification', label: 'Certification' },
];

export function KycUploader() {
  const [type, setType] = React.useState('id');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr('Choose a file first');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr('File too large (max 8 MB)');
      return;
    }
    setBusy(true);
    try {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sign in required');
      const path = `${user.id}/${type}-${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage.from('kyc').upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { error: rowErr } = await sb
        .from('provider_documents')
        .insert({ provider_id: user.id, doc_type: type, storage_path: path });
      if (rowErr) throw rowErr;

      // Trigger KYC verification check on the server.
      await fetch('/api/kyc/verify', { method: 'POST' });

      setOk('Uploaded.');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <form onSubmit={upload} className="space-y-3">
        <Field label="Document type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="tap w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="File">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="block w-full text-sm"
            required
          />
        </Field>
        {err && <p className="text-xs text-danger">{err}</p>}
        {ok && <p className="text-xs text-success">{ok}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</Button>
      </form>
      <p className="text-[11px] text-muted">
        Files are stored in a private bucket (<code className="font-mono-utility">kyc</code>) — only you and admins can read them.
      </p>
    </Card>
  );
}

