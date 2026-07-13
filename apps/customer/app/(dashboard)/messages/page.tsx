import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, EmptyState } from '@urban-assist/ui';
import { ukDateTime } from '@urban-assist/lib';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  const { data: bookings } = await db
    .from('bookings')
    .select('id, short_code, status, provider:profiles!bookings_provider_id_fkey(full_name,avatar_url), messages(content,created_at)')
    .eq('customer_id', user.id)
    .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'])
    .order('scheduled_at', { ascending: false })
    .limit(20);

  const list = (bookings ?? []).filter((b: any) => b.provider);

  return (
    <div className="space-y-4 py-2">
      <h1 className="font-display text-xl">Messages</h1>
      {!list.length ? (
        <EmptyState
          title="No conversations yet"
          description="Once a provider is matched to your booking, you'll be able to chat with them here."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((b: any) => {
            const last = (b.messages ?? []).sort(
              (a: any, c: any) => new Date(c.created_at).getTime() - new Date(a.created_at).getTime(),
            )[0];
            return (
              <li key={b.id}>
                <Link href={`/bookings/${b.id}`}>
                  <Card className="flex items-center gap-3 transition hover:border-ink">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-hairline">
                      {b.provider.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{b.provider.full_name}</span>
                        {last && <span className="font-mono-utility text-muted">{ukDateTime(last.created_at)}</span>}
                      </div>
                      <p className="truncate text-sm text-muted">{last?.content ?? 'Say hi to your provider'}</p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
