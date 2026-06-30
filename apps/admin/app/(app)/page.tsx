import { getSupabaseServer } from '@urban-assist/db/server';
import { Briefcase, Users, ShieldCheck, TicketCheck } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  hint?: string;
}

function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="card flex items-start gap-4">
      <div className="rounded-lg bg-accent/10 p-2.5 shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-xs text-muted font-mono-utility mb-0.5">{label}</p>
        <p className="text-2xl font-display font-bold text-ink">{value}</p>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const db = getSupabaseServer();

  // Parallel data fetches for the summary stats.
  const [bookingsRes, providersRes, kycRes, ticketsRes] = await Promise.all([
    db.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending_match'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('is_online', true),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'provider').eq('kyc_status', 'pending'),
    db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const stats = [
    {
      label: 'Pending Bookings',
      value: bookingsRes.count ?? 0,
      icon: Briefcase,
      hint: 'Awaiting provider assignment',
    },
    {
      label: 'Providers Online',
      value: providersRes.count ?? 0,
      icon: Users,
      hint: 'Currently available',
    },
    {
      label: 'KYC Pending',
      value: kycRes.count ?? 0,
      icon: ShieldCheck,
      hint: 'Awaiting review',
    },
    {
      label: 'Open Tickets',
      value: ticketsRes.count ?? 0,
      icon: TicketCheck,
      hint: 'Support tickets open',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Platform overview — live data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8 card">
        <p className="text-sm text-muted text-center py-8">
          Full booking management, KYC review queue, and support ticket views are coming next. 
          Navigate using the sidebar to explore available sections.
        </p>
      </div>
    </div>
  );
}
