'use client';
import * as React from 'react';
import { Card, Button, Badge, EmptyState } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { pence, ukDate } from '@urban-assist/lib';
import { Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck, ShieldAlert, ExternalLink, Printer } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'booking' | 'payout';
  title: string;
  date: string;
  amount_pence: number;
  status: string;
  method?: string;
}

export default function EarningsPage() {
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<any>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [stripeBusy, setStripeBusy] = React.useState(false);
  const [stripeError, setStripeError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;

        // Fetch profile
        const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).single();
        setProfile(p);

        // Fetch completed bookings (card & cash)
        const { data: bookings } = await sb
          .from('bookings')
          .select('id, short_code, completed_at, total_pence, payment_method, category:service_categories(name)')
          .eq('provider_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        // Fetch payouts
        const { data: payouts } = await sb
          .from('payouts')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        // Assemble transactions list
        const list: Transaction[] = [];

        (bookings ?? []).forEach((b: any) => {
          list.push({
            id: b.id,
            type: 'booking',
            title: `${b.category?.name} (#${b.short_code})`,
            date: b.completed_at || new Date().toISOString(),
            amount_pence: b.total_pence,
            status: 'succeeded',
            method: b.payment_method,
          });
        });

        (payouts ?? []).forEach((po: any) => {
          list.push({
            id: po.id,
            type: 'payout',
            title: 'Stripe Payout',
            date: po.created_at || new Date().toISOString(),
            amount_pence: po.amount_pence,
            status: po.status,
          });
        });

        // Sort by date desc
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(list);
      } catch (err) {
        console.error('Failed to load earnings data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Maths
  const cardEarnings = transactions
    .filter((t) => t.type === 'booking' && t.method === 'card')
    .reduce((s, t) => s + t.amount_pence, 0);

  const cashEarnings = transactions
    .filter((t) => t.type === 'booking' && t.method === 'cash')
    .reduce((s, t) => s + t.amount_pence, 0);

  const totalPaidOut = transactions
    .filter((t) => t.type === 'payout' && t.status === 'paid')
    .reduce((s, t) => s + t.amount_pence, 0);

  const balancePending = Math.max(0, cardEarnings - totalPaidOut);

  async function startStripeOnboarding() {
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to start onboarding');
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setStripeError(e.message);
    } finally {
      setStripeBusy(false);
    }
  }

  async function openStripeDashboard() {
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch (e: any) {
      setStripeError(e.message);
    } finally {
      setStripeBusy(false);
    }
  }

  async function requestInstantPayout() {
    if (balancePending <= 0) return;
    setStripeBusy(true);
    setStripeError(null);
    try {
      const res = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountPence: balancePending }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Payout request failed');
      }
      
      // Reload page
      window.location.reload();
    } catch (e: any) {
      setStripeError(e.message);
    } finally {
      setStripeBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="h-24 bg-hairline rounded-xl" />
          <div className="h-24 bg-hairline rounded-xl" />
          <div className="h-24 bg-hairline rounded-xl" />
        </div>
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  const hasStripe = !!profile?.stripe_account_id;

  return (
    <div className="space-y-6 py-2 printable-container">
      <header className="flex items-center justify-between no-print">
        <div>
          <p className="font-mono-utility text-muted">Financials</p>
          <h1 className="font-display text-xl">Earnings & Payouts</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="tap flex items-center gap-1 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-medium hover:bg-bg transition"
          title="Print statement"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="!p-4 flex flex-col justify-between">
          <div className="font-mono-utility text-muted flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-muted" /> Card Earnings
          </div>
          <div className="font-display text-2xl mt-2">{pence(cardEarnings)}</div>
          <div className="text-[10px] text-muted mt-1">Processed via Stripe</div>
        </Card>

        <Card className="!p-4 flex flex-col justify-between">
          <div className="font-mono-utility text-muted">Cash Collected</div>
          <div className="font-display text-2xl mt-2">{pence(cashEarnings)}</div>
          <div className="text-[10px] text-muted mt-1">Collected directly on site</div>
        </Card>

        <Card className="!p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="font-mono-utility text-muted">Pending Payout</div>
          <div className="font-display text-2xl mt-2 text-accent">{pence(balancePending)}</div>
          <div className="text-[10px] text-muted mt-1">Ready for transfer</div>
        </Card>
      </div>

      {/* Stripe Status card */}
      <Card className="no-print">
        {hasStripe ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-success/10 text-success shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-sm">Stripe Account Connected</div>
                <p className="text-xs text-muted">
                  Payouts will be automatically deposited. Payout Schedule: Weekly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openStripeDashboard}
                disabled={stripeBusy}
                className="flex items-center gap-1 text-xs"
              >
                Stripe Dashboard <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              {balancePending > 0 && (
                <Button
                  size="sm"
                  onClick={requestInstantPayout}
                  disabled={stripeBusy}
                  className="text-xs"
                >
                  {stripeBusy ? 'Processing…' : 'Instant Payout'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-danger/10 text-danger shrink-0">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <div className="font-medium text-sm">Stripe Setup Required</div>
                <p className="text-xs text-muted">
                  You need to connect your Stripe account to receive card payouts on your bookings.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={startStripeOnboarding} disabled={stripeBusy}>
              {stripeBusy ? 'Setting up…' : 'Connect Stripe'}
            </Button>
          </div>
        )}
        {stripeError && <p className="text-xs text-danger mt-2">{stripeError}</p>}
      </Card>

      {/* Transaction History */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold">Transaction History</h2>
        {!transactions.length ? (
          <EmptyState
            title="No transactions yet"
            description="Complete jobs to start earning. Your payment history will appear here."
          />
        ) : (
          <div className="border border-hairline rounded-xl bg-white overflow-hidden">
            <ul className="divide-y divide-hairline">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-4 hover:bg-bg/40 transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base truncate">
                        {t.title}
                      </span>
                      {t.type === 'booking' && t.method && (
                        <Badge tone={t.method === 'card' ? 'accent' : 'muted'}>
                          {t.method === 'card' ? 'Card' : 'Cash'}
                        </Badge>
                      )}
                      {t.type === 'payout' && (
                        <Badge tone={t.status === 'paid' ? 'success' : 'accent'}>
                          {t.status === 'paid' ? 'Paid' : t.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">{ukDate(t.date)}</p>
                  </div>
                  <div className={`font-mono-utility text-right font-semibold text-sm sm:text-base ${
                    t.type === 'payout' ? 'text-danger' : 'text-success'
                  }`}>
                    {t.type === 'payout' ? '-' : '+'}{pence(t.amount_pence)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Self-employed tax record info for UK */}
      <footer className="text-center text-[10px] text-muted py-4 border-t border-hairline mt-8 print-only-tax-footer">
        <p>HomeEase Pro Statement · Local UK currency: GBP · Inclusive of VAT where applicable.</p>
        <p className="mt-1">Generated on {new Date().toLocaleDateString('en-GB')} for UK HMRC Self-Employment Records.</p>
      </footer>

      {/* Print-specific style helper */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}

