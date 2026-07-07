'use client';
import { MapPin, Search, ChevronDown, Wrench, Sparkles, PaintBucket, Bug, Zap, Shirt, Wind, Shovel, Grid3X3, Star, ArrowRight, Gift, ChevronRight, Home, CalendarClock, Wallet, User, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

/* ── Sticky Bottom Nav ─────────────────────────────────── */

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-white lg:hidden">
      <ul className="mx-auto flex max-w-lg items-center justify-around py-1.5">
        {[
          { icon: Home, label: 'Home', href: '/', active: true },
          { icon: CalendarClock, label: 'Bookings', href: '/bookings' },
          { icon: Wallet, label: 'Wallet', href: '#' },
          { icon: User, label: 'Profile', href: '/account' },
        ].map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
            >
              <item.icon className={`h-5 w-5 ${item.active ? 'text-accent' : 'text-muted'}`} />
              <span className={`text-[10px] font-semibold ${item.active ? 'text-accent' : 'text-muted'}`}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── Mobile Header ─────────────────────────────────────── */

function MobileHeader() {
  return (
    <header className="lg:hidden" style={{ background: '#1F3A4D' }}>
      <div className="px-4 pb-4 pt-3">
        {/* Top row: settings + location */}
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </span>
          <div className="flex items-center gap-1 text-white">
            <MapPin className="h-3.5 w-3.5 text-amber" />
            <span className="text-[12px] font-semibold">Current Location</span>
            <ChevronDown className="h-3 w-3 text-white/60" />
          </div>
        </div>
        {/* Address */}
        <p className="mb-3 text-[11px] text-white/60">Select Delivery/Service Address...</p>
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search for services..."
            className="w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-muted focus:outline-none"
            style={{ minHeight: 40 }}
          />
        </div>
      </div>
    </header>
  );
}

/* ── Mobile Hero ────────────────────────────────────────── */

function MobileHero() {
  return (
    <section className="lg:hidden bg-white px-4 pb-2 pt-4">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F1EB' }}>
        <div className="flex flex-col p-5">
          <span className="inline-block self-start rounded-full bg-accent/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.04em] text-accent">
            Limited offer
          </span>
          <h2 className="mt-2 text-[20px] font-extrabold leading-tight text-ink">
            Up to 50% Off<br />On First Booking!
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            Use code <strong className="text-accent">URBAN50</strong>
          </p>
          <div className="mt-3 h-32 w-full rounded-xl bg-hairline/40" />
        </div>
      </div>
    </section>
  );
}

/* ── Quick Service Grid (4x2) ──────────────────────────── */

const quickServices = [
  { icon: Sparkles, label: 'Massage', color: '#C1622E' },
  { icon: Sparkles, label: "Women's Salon", color: '#6B8F6B' },
  { icon: Wind, label: 'AC Repair', color: '#1F3A4D' },
  { icon: Bug, label: 'Cleaning', color: '#D9A441' },
  { icon: PaintBucket, label: 'Painting', color: '#C1622E' },
  { icon: Wrench, label: 'Appliance', color: '#6B8F6B' },
  { icon: Zap, label: 'Electrician', color: '#1F3A4D' },
  { icon: Grid3X3, label: 'All Services', color: '#6B6A62' },
];

function QuickServiceGrid() {
  return (
    <section className="lg:hidden bg-white px-4 py-4">
      <div className="grid grid-cols-4 gap-3">
        {quickServices.map((s) => {
          const Icon = s.icon;
          return (
            <a key={s.label} href="#" className="flex flex-col items-center gap-1.5">
              <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${s.color}12` }}>
                <Icon className="h-5 w-5" style={{ color: s.color }} />
              </span>
              <span className="text-[10px] font-semibold text-center leading-tight text-ink">{s.label}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ── Horizontal Scroll Section ──────────────────────────── */

function HorizScroll({ title, items }: {
  title: string;
  items: { name: string; desc?: string; price?: string; rating?: string; reviews?: string; image?: boolean }[];
}) {
  return (
    <section className="lg:hidden bg-white pb-2 pt-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
        <a href="#" className="flex items-center gap-0.5 text-[12px] font-semibold text-accent">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) => (
          <div key={item.name} className="w-36 shrink-0 snap-start">
            <div className="h-24 w-full rounded-xl bg-hairline/40" />
            <div className="mt-2">
              <span className="text-[12px] font-bold text-ink">{item.name}</span>
              {item.desc && <p className="text-[10px] text-muted">{item.desc}</p>}
              {item.rating && (
                <div className="mt-0.5 flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber text-amber" />
                  <span className="text-[10px] font-semibold text-muted">{item.rating}</span>
                  {item.reviews && <span className="text-[9px] text-muted">({item.reviews})</span>}
                </div>
              )}
              {item.price && <span className="text-[13px] font-extrabold text-ink">{item.price}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── In The Spotlight ───────────────────────────────────── */

function Spotlight() {
  return (
    <section className="lg:hidden bg-white px-4 py-4">
      <h3 className="mb-3 text-[16px] font-extrabold text-ink">In the Spotlight</h3>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#E4D4C4' }}>
        <div className="p-5">
          <span className="inline-block rounded-full bg-white/30 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-ink">
            Flat discount
          </span>
          <h4 className="mt-2 text-[18px] font-extrabold text-ink">Upgrade to Luxe for 15% more</h4>
          <div className="my-3 h-28 w-full rounded-xl bg-hairline/50" />
          <a href="#" className="inline-block rounded-lg bg-accent px-5 py-2.5 text-[13px] font-bold text-white">
            Book Now
          </a>
        </div>
        <div className="flex justify-center gap-2 pb-4">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
          <span className="h-2 w-2 rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  );
}

/* ── Stacked Promo Cards ────────────────────────────────── */

function StackedPromos() {
  return (
    <section className="lg:hidden bg-white space-y-3 px-4 py-2 pb-4">
      {[
        { title: 'Get squeaky clean bathrooms', label: null, cta: 'Learn More', bg: '#E8F0E8' },
        { title: 'Salon Finish at home', label: 'Trending', cta: 'Book Salon', bg: '#EEEAFF' },
        { title: 'Designed to be bold. Built to protect.', label: 'Launch', cta: 'Buy Now', bg: '#F5F1EB' },
      ].map((card) => (
        <div key={card.title} className="relative rounded-2xl overflow-hidden" style={{ background: card.bg }}>
          <div className="p-5">
            {card.label && (
              <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.04em] text-accent">
                {card.label}
              </span>
            )}
            <h4 className="mt-2 text-[16px] font-extrabold text-ink max-w-[70%]">{card.title}</h4>
            <div className="mt-2 h-20 w-full rounded-xl bg-hairline/40" />
            <a href="#" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-white">
              {card.cta}
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ── Categorized Lists ──────────────────────────────────── */

function CategorizedLists() {
  return (
    <section className="lg:hidden bg-white space-y-6 px-4 py-4">
      {[
        { title: 'Cleaning Essentials', items: ['Sofa Dry Cleaning - £249', 'Kitchen Degreasing - £599', 'Bathroom Deep Clean - £399'] },
        { title: 'Appliance Repair & Service', items: ['Refrigerator Fix - £199', 'Washing Machine - £299', 'AC Service - £349'] },
      ].map((cat) => (
        <div key={cat.title}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[16px] font-extrabold text-ink">{cat.title}</h3>
            <a href="#" className="flex items-center gap-0.5 text-[12px] font-semibold text-accent">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="space-y-3">
            {cat.items.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-xl bg-hairline/40" />
                <div>
                  <span className="text-[13px] font-bold text-ink">{item.split(' - ')[0]}</span>
                  <p className="text-[13px] font-extrabold text-ink">{item.split(' - ')[1]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ── Referral Card ──────────────────────────────────────── */

function ReferralCard() {
  return (
    <section className="lg:hidden bg-white px-4 py-3">
      <div className="rounded-2xl border border-hairline bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-[15px] font-extrabold text-ink">Great service deserves to be shared</h3>
            <p className="mt-1 text-[12px] text-muted">Invite your friends to try Urban Assist!</p>
            <a href="#" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-[12px] font-bold text-white">
              Invite Now
            </a>
          </div>
          <div className="ml-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
            <Gift className="h-8 w-8 text-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Mobile Footer ──────────────────────────────────────── */

function MobileFooter() {
  const [open, setOpen] = useState<string | null>(null);
  const sections = {
    'Quick Links': ['About Us', 'Careers', 'Privacy Policy', 'Impact'],
    'For Customers': ['All Services', 'Categories Near Me', 'Contact Support'],
    'For Professionals': ['Register as a Partner', 'Download Partner App'],
  };

  return (
    <footer className="lg:hidden pb-20" style={{ background: '#1F3A4D' }}>
      <div className="px-4 py-8">
        {/* Logo + name */}
        <div className="mb-6 flex items-center gap-2.5">
          <span className="block h-9 w-9 rounded-[9px] border border-white/20 bg-hairline/20" />
          <span className="text-[15px] font-extrabold text-[#F5F1EB]">Urban Assist</span>
        </div>

        {/* Accordion links */}
        {Object.entries(sections).map(([heading, links]) => {
          const isOpen = open === heading;
          return (
            <div key={heading} className="border-b border-white/10">
              <button
                className="flex w-full items-center justify-between py-3 text-[13px] font-bold text-[#F5F1EB]"
                onClick={() => setOpen(isOpen ? null : heading)}
              >
                {heading}
                <ChevronUp className={`h-4 w-4 text-white/60 transition ${isOpen ? '' : 'rotate-180'}`} />
              </button>
              {isOpen && (
                <ul className="space-y-2 pb-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-[12px] text-[#9FB1BC]">{link}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Social icons */}
        <div className="mt-6 flex gap-4">
          {['f', 't', 'i', 'in'].map((s) => (
            <a key={s} href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white/70">
              {s}
            </a>
          ))}
        </div>

        {/* App buttons */}
        <div className="mt-4 flex gap-3">
          <a href="#" className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] font-bold text-white backdrop-blur">
            App Store
          </a>
          <a href="#" className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-center text-[12px] font-bold text-white backdrop-blur">
            Google Play
          </a>
        </div>

        {/* Copyright */}
        <p className="mt-6 text-[10px] text-[#7E93A0] text-center">
          &copy; 2026 Urban Assist Private Limited.
        </p>
      </div>
    </footer>
  );
}

/* ── Exported MobileHome → renders all mobile sections ──── */

export function MobileHome() {
  return (
    <>
      <MobileHeader />
      <MobileHero />
      <QuickServiceGrid />
      <HorizScroll title="Trending Near You" items={[
        { name: 'Instant Appliance Repair', image: true },
        { name: 'Professional Deep Cleaning', image: true },
        { name: 'AC Service & Repair', image: true },
        { name: 'Bathroom Waterproofing', image: true },
      ]} />
      <Spotlight />
      <HorizScroll title="New and Noteworthy" items={[
        { name: 'Smart Water Purifier', price: '£299' },
        { name: 'Electronic Gas Hob', price: '£199' },
        { name: 'Secure Smart Door Lock', price: '£149' },
        { name: 'Air Purifier', price: '£249' },
      ]} />
      <HorizScroll title="Most Booked Services" items={[
        { name: 'Bathroom Deep Cleaning', rating: '4.9', reviews: '240k', price: '£399' },
        { name: 'AC Jet Max Service', rating: '4.8', reviews: '120k', price: '£499' },
        { name: 'Full Home Cleaning', rating: '4.9', reviews: '180k', price: '£599' },
      ]} />
      <StackedPromos />
      <CategorizedLists />
      <ReferralCard />
      <MobileFooter />
      <BottomNav />
    </>
  );
}
