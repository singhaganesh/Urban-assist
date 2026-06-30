import Link from 'next/link';
import { getSupabaseServer } from '@urban-assist/db/server';
import { Card, Badge, EmptyState, Button } from '@urban-assist/ui';
import * as Icons from 'lucide-react';
import { pence } from '@urban-assist/lib';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = getSupabaseServer();
  const { data: categories } = await db
    .from('service_categories')
    .select('*')
    .order('sort_order');

  return (
    <div className="space-y-8 py-2">
      <section>
        <h1 className="font-display text-2xl leading-tight">
          Book a trusted home service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Verified local providers, transparent prices, live status updates.
        </p>
        <form action="/services" className="mt-5">
          <label className="sr-only" htmlFor="q">Search</label>
          <div className="relative">
            <Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              id="q"
              name="q"
              placeholder="Search services or providers"
              className="tap w-full rounded-xl border border-hairline bg-white py-3 pl-10 pr-4 text-sm placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Browse by category</h2>
          <Link href="/services" className="text-xs text-muted hover:text-ink">
            See all
          </Link>
        </div>
        {!categories?.length ? (
          <EmptyState
            title="No categories yet"
            description="Run the seed migration to load standard UK home-service categories."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => {
              const Icon = (Icons as any)[pascal(c.icon ?? 'sparkles')] ?? Icons.Sparkles;
              return (
                <li key={c.id}>
                  <Link
                    href={`/services?category=${c.slug}`}
                    className="card flex h-full flex-col items-start gap-3 transition hover:border-ink"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-[color:rgb(var(--accent))]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="mt-1 font-mono-utility text-muted">
                        From {pence(c.min_price_pence)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <Badge tone="accent">1</Badge>
            <h3 className="mt-2 font-medium">Pick a service</h3>
            <p className="mt-1 text-sm text-muted">
              Browse categories, compare providers, see real prices in pounds.
            </p>
          </Card>
          <Card>
            <Badge tone="accent">2</Badge>
            <h3 className="mt-2 font-medium">We match a provider</h3>
            <p className="mt-1 text-sm text-muted">
              Our matching engine picks the best nearby provider in seconds.
            </p>
          </Card>
          <Card>
            <Badge tone="accent">3</Badge>
            <h3 className="mt-2 font-medium">Track and pay</h3>
            <p className="mt-1 text-sm text-muted">
              Watch progress live. Pay by card or cash on completion.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function pascal(s: string) {
  return s
    .split(/[-_\s]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}
