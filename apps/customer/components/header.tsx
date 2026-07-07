import Link from 'next/link';
import { Search, MapPin, ShoppingCart, User, ChevronDown } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-page items-center gap-4 px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-[9px] text-[15px] font-extrabold leading-none text-white"
            style={{ background: '#1F3A4D' }}
          >
            UA
          </span>
          <span className="hidden text-[15px] font-extrabold text-ink sm:inline">
            Urban Assist
          </span>
        </Link>

        {/* Location */}
        <button className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink">
          <MapPin className="h-4 w-4 text-accent" />
          <span className="hidden sm:inline">London</span>
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>

        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 0 }}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search for services..."
            className="w-full rounded-xl border border-input-border bg-bg py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            style={{ minHeight: 40 }}
          />
        </div>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 text-[15px] lg:flex">
          <Link href="/" className="font-bold text-ink" style={{ borderBottom: '2px solid #C1622E' }}>
            Home
          </Link>
          <Link href="/services" className="font-medium text-muted hover:text-ink">
            Services
          </Link>
          <Link href="/bookings" className="font-medium text-muted hover:text-ink">
            Bookings
          </Link>
        </nav>

        {/* Icon buttons */}
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input-border bg-white"
          aria-label="Cart"
        >
          <ShoppingCart className="h-4 w-4 text-ink" />
        </button>
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input-border bg-white"
          aria-label="Account"
        >
          <User className="h-4 w-4 text-ink" />
        </button>
      </div>
    </header>
  );
}
