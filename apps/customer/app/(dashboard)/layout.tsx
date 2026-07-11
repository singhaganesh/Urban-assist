import { AppShell, NavItem } from '@urban-assist/ui';
import { Home, CalendarClock, MessageCircle, UserRound } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';

const nav: NavItem[] = [
  { href: '/browse', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { href: '/bookings', label: 'Bookings', icon: <CalendarClock className="h-4 w-4" /> },
  { href: '/messages', label: 'Messages', icon: <MessageCircle className="h-4 w-4" /> },
  { href: '/account', label: 'Account', icon: <UserRound className="h-4 w-4" /> },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  return <AppShell nav={nav} brand="Urban Assist">{children}</AppShell>;
}
