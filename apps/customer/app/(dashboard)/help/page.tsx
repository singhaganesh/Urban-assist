import { getSupabaseServer } from '@urban-assist/db/server';
import { Badge, Card } from '@urban-assist/ui';
import { ukDateTime } from '@urban-assist/lib';
import { SupportForm } from './support-form';

export const dynamic = 'force-dynamic';

const FAQS = [
  {
    q: 'How do I reschedule or cancel a booking?',
    a: 'Open the booking from "Bookings" and use the Cancel button — free any time before the professional is on their way. Card payments are refunded in full. To reschedule, cancel and book a new slot, or message your provider.',
  },
  {
    q: 'When am I charged?',
    a: 'Card payments are taken when you confirm the booking. Cash is paid to the professional after the job — then confirm it in the app.',
  },
  {
    q: 'How do refunds work?',
    a: "Cancel before the professional is en route and card payments refund automatically to the same card, usually within 5–10 working days.",
  },
  {
    q: 'Who are the professionals?',
    a: 'Every provider passes identity (KYC) verification before they can take bookings, and carries a public rating from verified customers.',
  },
  {
    q: 'What is the 4-digit start code?',
    a: "It's shown on your booking once a professional is assigned. Give it to them on arrival — it confirms the right person starts the job.",
  },
];

const ticketTone: Record<string, 'accent' | 'success' | 'muted' | 'danger'> = {
  open: 'accent',
  in_review: 'accent',
  resolved: 'success',
  closed: 'muted',
};

export default async function HelpPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  const { data: tickets } = await db
    .from('support_tickets')
    .select('id, category, description, status, created_at')
    .eq('raised_by', user!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-5 py-2">
      <h1 className="font-display text-xl">Help & Support</h1>

      <section className="space-y-2">
        <h2 className="text-xs font-mono-utility text-muted">Frequently asked questions</h2>
        <Card className="divide-y divide-hairline p-0">
          {FAQS.map((f) => (
            <details key={f.q} className="group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </Card>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-mono-utility text-muted">Still stuck? Raise a ticket</h2>
        <SupportForm />
      </section>

      {!!tickets?.length && (
        <section className="space-y-2">
          <h2 className="text-xs font-mono-utility text-muted">Your tickets</h2>
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li key={t.id}>
                <Card className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{t.category}</div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{t.description}</p>
                    <div className="mt-1 text-[11px] text-muted">{ukDateTime(t.created_at)}</div>
                  </div>
                  <Badge tone={ticketTone[t.status] ?? 'muted'}>{t.status.replace(/_/g, ' ')}</Badge>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
