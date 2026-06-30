import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  TicketCheck,
  LogOut,
} from 'lucide-react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: Briefcase },
  { href: '/providers', label: 'Providers', icon: Users },
  { href: '/kyc', label: 'KYC Queue', icon: ShieldCheck },
  { href: '/tickets', label: 'Support', icon: TicketCheck },
];

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login');

  // Only allow admin-role users.
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-hairline px-4 py-6 gap-1 shrink-0">
        <div className="px-2 mb-6">
          <span className="font-display text-base font-bold text-ink">HomeEase</span>
          <span className="ml-1 text-xs text-muted font-mono-utility">ADMIN</span>
        </div>

        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-ink hover:bg-hairline/40 transition-colors"
          >
            <Icon className="h-4 w-4 text-muted shrink-0" />
            {label}
          </Link>
        ))}

        <div className="mt-auto">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              id="admin-logout"
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 w-full transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
