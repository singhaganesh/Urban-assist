'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { getAllServicesFlat } from '../../lib/services-data';

// Flat list is static taxonomy data — build it once at module load.
const ALL_SERVICES = getAllServicesFlat();

export function ServiceSearch() {
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return ALL_SERVICES.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.categoryName.toLowerCase().includes(term) ||
        s.subcategoryName.toLowerCase().includes(term),
    ).slice(0, 8);
  }, [q]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search all services…"
        className="w-full rounded-xl border border-input-border bg-white py-2.5 pl-10 pr-4 text-[14px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-hairline bg-white shadow-card">
          {results.map((s) => (
            <li key={`${s.categorySlug}-${s.id}`}>
              <Link
                href={`/browse?category=${s.categorySlug}&q=${encodeURIComponent(s.name)}`}
                className="flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-bg"
              >
                <span className="font-semibold text-ink">{s.name}</span>
                <span className="ml-3 shrink-0 text-[11px] text-muted">{s.categoryName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
