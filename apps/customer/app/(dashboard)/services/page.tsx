import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Badge, Card, EmptyState, RatingStars } from '@urban-assist/ui';
import { pence } from '@urban-assist/lib';
import { getCached, setCached } from '@urban-assist/server-lib';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { category?: string; q?: string };
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const db = getSupabaseServer();

  // Resolve category if filtering by slug.
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  if (searchParams.category) {
    const { data } = await db
      .from('service_categories')
      .select('id,name')
      .eq('slug', searchParams.category)
      .single();
    if (data) {
      categoryId = data.id;
      categoryName = data.name;
    }
  }

  // Check Upstash Redis cache first
  const cacheKey = `search:${searchParams.category ?? 'all'}:${searchParams.q ?? 'all'}`;
  let filtered = await getCached<any[]>(cacheKey);

  if (!filtered) {
    let query = db
      .from('provider_services')
      .select('id, title, price_pence, duration_mins, category_id, provider:profiles!inner(id, full_name, avatar_url, rating_avg, rating_count, kyc_status)')
      .eq('is_active', true)
      .limit(50);
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data: services } = await query;

    filtered = (services ?? []).filter((s) =>
      searchParams.q
        ? (s.title + ' ' + ((s as any).provider?.full_name ?? '')).toLowerCase().includes(searchParams.q.toLowerCase())
        : true,
    );

    // Cache the filtered search results for 60 seconds
    await setCached(cacheKey, filtered, 60);
  }

  return (
    <div className="space-y-5 py-2">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl">
          {categoryName ? categoryName : 'All services'}
        </h1>
        <Link href="/" className="text-xs text-muted hover:text-ink">All categories</Link>
      </header>

      {!filtered.length ? (
        <EmptyState
          title="No services found"
          description="Providers haven't published in this category yet. Try another category, or check back soon."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((s: any) => (
            <li key={s.id}>
              <Link href={`/book/${s.id}`} className="block">
                <Card className="flex items-center gap-4 transition hover:border-ink">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-hairline">
                    {s.provider?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.provider.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.title}</span>
                      {s.provider?.kyc_status === 'approved' ? (
                        <Badge tone="success">Verified</Badge>
                      ) : (
                        <Badge tone="muted">Pending</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {s.provider?.full_name ?? 'Provider'} · {s.duration_mins} min
                    </div>
                    <div className="mt-1">
                      <RatingStars value={Number(s.provider?.rating_avg ?? 0)} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-utility text-muted">From</div>
                    <div className="font-display text-lg">{pence(s.price_pence)}</div>
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
