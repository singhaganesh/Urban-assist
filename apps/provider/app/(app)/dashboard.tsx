'use client';
import * as React from 'react';
import Link from 'next/link';
import { Button, Card, Badge, EmptyState, RatingStars } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { OfferCard } from './offer-card';

export function Dashboard({
  profile,
  jobsToday,
  openOffer: initialOffer,
  servicesCount,
}: {
  profile: any;
  jobsToday: any[];
  openOffer: any | null;
  servicesCount: number;
}) {
  const [online, setOnline] = React.useState<boolean>(!!profile?.is_online);
  const [offer, setOffer] = React.useState(initialOffer);
  const [toggling, setToggling] = React.useState(false);

  // Live: listen for new offers landing in `notifications`.
  React.useEffect(() => {
    const sb = supabase();
    const ch = sb
      .channel(`provider-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
        async (payload) => {
          const n = payload.new as any;
          if (n.type !== 'offer.new') return;
          // Fetch the offer fresh so we have booking + address.
          const { data } = await sb
            .from('booking_offers')
            .select('id, booking_id, responds_by, booking:bookings(id,short_code,scheduled_at,total_pence,category:service_categories(name),address:addresses(line1,postcode))')
            .eq('id', n.payload.offer_id)
            .single();
          if (data) setOffer(data as any);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [profile.id]);

  async function toggleOnline() {
    setToggling(true);
    const next = !online;
    await fetch('/api/online', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ online: next }),
    });
    setOnline(next);
    setToggling(false);
  }

  const earningsToday = jobsToday
    .filter((j) => j.status === 'completed')
    .reduce((s, j) => s + (j.total_pence ?? 0), 0);

  return (
    <div className="space-y-4 py-2">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono-utility text-muted">Today</p>
          <h1 className="font-display text-xl">{greet()}</h1>
        </div>
        <button
          onClick={toggleOnline}
          disabled={toggling}
          className={`tap rounded-full px-4 py-2 text-xs font-medium ${
            online ? 'bg-success text-bg' : 'bg-hairline text-ink'
          }`}
        >
          {online ? 'Online' : 'Offline'}
        </button>
      </header>

      {profile.kyc_status !== 'approved' && (
        <Card className="border-accent/50 bg-accent/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">Verification pending</div>
              <p className="text-sm text-muted">
                Upload your ID, insurance and any certifications to start accepting jobs.
              </p>
            </div>
            <Link href="/onboarding"><Button>Continue</Button></Link>
          </div>
        </Card>
      )}

      {servicesCount === 0 && (
        <Card>
          <div className="font-medium">Set up your services</div>
          <p className="mt-1 text-sm text-muted">
            Pick the categories you cover and set your prices.
          </p>
          <Link href="/onboarding/services"><Button className="mt-3">Add services</Button></Link>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today's jobs" value={jobsToday.length.toString()} />
        <Stat label="Earnings" value={pence(earningsToday)} />
        <Stat label="Rating" value={Number(profile.rating_avg ?? 0).toFixed(1)} sub={`${profile.rating_count ?? 0} reviews`} />
        <Stat label="Accept rate" value={`${Math.round(Number(profile.acceptance_rate ?? 1) * 100)}%`} />
      </div>

      {offer && <OfferCard offer={offer} onResolved={() => setOffer(null)} />}

      <section>
        <h2 className="mb-2 font-display text-lg">Today's schedule</h2>
        {!jobsToday.length ? (
          <EmptyState
            title="No jobs scheduled today"
            description={online ? "We'll send offers when there's a match nearby." : 'Go online to start receiving offers.'}
          />
        ) : (
          <ul className="space-y-2">
            {jobsToday.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`}>
                  <Card className="flex items-center gap-3 transition hover:border-ink">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{j.category?.name ?? 'Job'}</span>
                        <Badge tone={j.status === 'completed' ? 'success' : 'accent'}>{j.status.replace(/_/g, ' ')}</Badge>
                      </div>
                      <div className="text-xs text-muted">
                        {ukDateTime(j.scheduled_at)} · {[j.address?.line1, j.address?.postcode].filter(Boolean).join(', ')}
                      </div>
                      <div className="font-mono-utility text-muted">#{j.short_code}</div>
                    </div>
                    <div className="text-right font-display text-lg">{pence(j.total_pence)}</div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="!p-3">
      <div className="font-mono-utility text-muted">{label}</div>
      <div className="font-display text-lg">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </Card>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

