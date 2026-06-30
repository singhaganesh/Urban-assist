import { getSupabaseServer } from '@urban-assist/db/server';
import { TicketCheck, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SupportTicketsPage() {
  const db = getSupabaseServer();
  const { data: tickets } = await db
    .from('support_tickets')
    .select('id, subject, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const count = tickets?.length ?? 0;
  const openCount = tickets?.filter((t) => t.status === 'open').length ?? 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Support Tickets</h1>
        <p className="text-sm text-muted mt-1">
          {count} total · {openCount} open.
        </p>
      </div>

      {!tickets || tickets.length === 0 ? (
        <div className="card flex flex-col items-center py-12 gap-3">
          <TicketCheck className="h-8 w-8 text-muted" />
          <p className="text-sm text-muted">No support tickets yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-ink text-sm">{t.subject}</p>
                  <p className="text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono-utility px-2 py-0.5 rounded-full ${
                    t.status === 'open'
                      ? 'bg-amber-100 text-amber-700'
                      : t.status === 'resolved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
