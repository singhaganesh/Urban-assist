import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Button, Badge } from '@urban-assist/ui';
import { KycUploader } from './kyc-uploader';
import { CheckCircle2, AlertCircle, FileText, ShieldCheck, ArrowRight } from 'lucide-react';

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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="font-mono-utility text-xs font-semibold uppercase tracking-wider text-muted">
          Step 1 of 2
        </p>
        <h1 className="font-display text-2xl font-bold text-ink">Get verified</h1>
        <p className="text-sm text-muted">
          Upload the documents below. Once both required items are uploaded, your status will update automatically.
        </p>
      </header>

      {/* Verification status card */}
      <Card className="!p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="font-display font-semibold text-ink">Verification status</span>
          </div>
          <Badge tone={profile?.kyc_status === 'approved' ? 'success' : 'accent'}>
            {profile?.kyc_status ?? 'pending'}
          </Badge>
        </div>

        <div className="divide-y divide-hairline text-sm">
          {required.map((r) => {
            const isUploaded = have.has(r);
            return (
              <div key={r} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  {isUploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-[color:rgb(var(--success))]" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-[color:rgb(var(--accent))]" />
                  )}
                  <div>
                    <p className="font-medium text-charcoal">
                      {r === 'id' ? 'Photo ID' : 'Public Liability Insurance'}
                    </p>
                    <p className="text-xs text-muted">
                      {r === 'id'
                        ? 'Valid UK passport or driving licence'
                        : 'Required minimum coverage of £1M'}
                    </p>
                  </div>
                </div>
                <Badge tone={isUploaded ? 'success' : 'danger'}>
                  {isUploaded ? 'Uploaded' : 'Missing'}
                </Badge>
              </div>
            );
          })}

          <div className="flex items-center justify-between py-3 last:pb-0">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted" />
              <div>
                <p className="font-medium text-charcoal">Certifications (optional)</p>
                <p className="text-xs text-muted">Trade qualifications or professional memberships</p>
              </div>
            </div>
            <Badge tone="muted">
              {(docs ?? []).filter((d) => d.doc_type === 'certification').length} uploaded
            </Badge>
          </div>
        </div>
      </Card>

      <KycUploader />

      {/* Next step card */}
      <Card className="!p-5 space-y-3">
        <h3 className="font-display font-semibold text-ink">Next step: Services &amp; pricing</h3>
        <p className="text-sm text-charcoal">
          Once your identity and insurance are verified, you can select the service categories you cover and configure your pricing.
        </p>
        {missing.length > 0 ? (
          <Button disabled className="w-full flex items-center justify-center gap-2">
            Complete verification first
          </Button>
        ) : (
          <Link href="/onboarding/services" className="block w-full">
            <Button className="w-full flex items-center justify-center gap-2">
              Set up services <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </Card>
    </div>
  );
}

