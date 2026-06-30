import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Button, Badge } from '@urban-assist/ui';
import { KycUploader } from './kyc-uploader';

export const dynamic = 'force-dynamic';

export default async function Onboarding() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
  const { data: docs } = await db.from('provider_documents').select('*').eq('provider_id', user.id);

  const required = ['id', 'insurance'];
  const have = new Set((docs ?? []).map((d) => d.doc_type));
  const missing = required.filter((r) => !have.has(r));

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <header>
        <p className="font-mono-utility text-muted">Step 1 of 2</p>
        <h1 className="font-display text-2xl">Get verified</h1>
        <p className="mt-2 text-sm text-muted">
          Upload the documents below. Once both required items are in, your status flips to verified automatically.
          We leave a hook for a real KYC review provider to plug in later.
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Verification status</div>
          <Badge tone={profile?.kyc_status === 'approved' ? 'success' : 'accent'}>
            {profile?.kyc_status ?? 'pending'}
          </Badge>
        </div>
        <ul className="space-y-1 text-sm">
          {required.map((r) => (
            <li key={r} className="flex items-center justify-between">
              <span>{r === 'id' ? 'Photo ID (passport or driving licence)' : 'Public liability insurance'}</span>
              <Badge tone={have.has(r) ? 'success' : 'muted'}>{have.has(r) ? 'Uploaded' : 'Missing'}</Badge>
            </li>
          ))}
          <li className="flex items-center justify-between">
            <span>Certifications (optional)</span>
            <Badge tone="muted">{(docs ?? []).filter((d) => d.doc_type === 'certification').length} uploaded</Badge>
          </li>
        </ul>
      </Card>

      <KycUploader />

      <Card className="space-y-2">
        <div className="font-medium">Next: services & pricing</div>
        <p className="text-sm text-muted">
          Once verified you can add the categories you cover and set your prices.
        </p>
        {missing.length > 0 ? (
          <Button disabled>Set up services</Button>
        ) : (
          <Link href="/onboarding/services">
            <Button>Set up services</Button>
          </Link>
        )}
      </Card>
    </div>
  );
}
