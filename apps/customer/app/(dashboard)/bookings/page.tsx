import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge, EmptyState, Button } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';

export const dynamic = 'force-dynamic';

const statusTone: Record<string, 'accent' | 'success' | 'danger' | 'muted'> = {
  pending_match: 'accent',
  assigned: 'accent',
  on_the_way: 'accent',
  arrived: 'accent',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'danger',
  unmatched: 'danger',
  disputed: 'danger',
};

export default async function BookingsList() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const { data: bookings } = await db
    .from('bookings')
    .select('id, short_code, scheduled_at, status, total_pence, category:service_categories(name), provider:profiles!bookings_provider_id_fkey(full_name)')
    .eq('customer_id', user!.id)
    .order('scheduled_at', { ascending: false });

  return (
    <div className="space-y-4 py-2">
      <h1 className="font-display text-xl">Your bookings</h1>
      {!bookings?.length ? (
        <EmptyState
          title="No bookings yet"
          description="Find a service to get started."
          action={<Link href="/"><Button>Find a service</Button></Link>}
        />
      ) : (
        <ul className="space-y-3">
          {bookings.map((b: any) => (
            <li key={b.id}>
              <Link href={`/bookings/${b.id}`}>
                <Card className="flex items-center gap-4 transition hover:border-ink">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.category?.name ?? 'Service'}</span>
                      <Badge tone={statusTone[b.status] ?? 'muted'}>{prettyStatus(b.status)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {ukDateTime(b.scheduled_at)} · {b.provider?.full_name ?? '—'}
                    </div>
                    <div className="mt-1 font-mono-utility text-muted">#{b.short_code}</div>
                  </div>
                  <div className="text-right font-display text-lg">
                    {pence(b.total_pence)}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function prettyStatus(s: string) {
  return s.replace(/_/g, ' ');
}
