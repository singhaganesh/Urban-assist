'use client';
// Job-offer card with countdown timer. Accept or decline → cascade engine.

import * as React from 'react';
import { Button, Card, Badge } from '@urban-assist/ui';
import { pence, ukDateTime } from '@urban-assist/lib';
import { Clock } from 'lucide-react';

export function OfferCard({ offer, onResolved }: { offer: any; onResolved: () => void }) {
  const respondsBy = new Date(offer.responds_by).getTime();
  const [secsLeft, setSecsLeft] = React.useState(Math.max(0, Math.floor((respondsBy - Date.now()) / 1000)));
  const [busy, setBusy] = React.useState<'accept' | 'decline' | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((respondsBy - Date.now()) / 1000));
      setSecsLeft(left);
      if (left === 0) {
        clearInterval(t);
        fetch(`/api/offers/${offer.id}/expire`, { method: 'POST' })
          .catch(() => {})
          .finally(() => onResolved());
      }
    }, 1000);
    return () => clearInterval(t);
  }, [respondsBy, onResolved]);

  const pct = Math.max(0, Math.min(100, (secsLeft / 90) * 100));

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'decline');
    setErr(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      onResolved();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  }

  const b = offer.booking ?? {};
  return (
    <Card className="space-y-3 border-accent">
      <div className="flex items-center justify-between">
        <Badge tone="accent">New offer</Badge>
        <div className="flex items-center gap-1 font-mono-utility text-muted">
          <Clock className="h-3.5 w-3.5" /> {secsLeft}s
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div>
        <div className="font-display text-lg">{b.category?.name ?? 'Job'}</div>
        <p className="text-sm text-muted">
          {ukDateTime(b.scheduled_at)} · {[b.address?.line1, b.address?.postcode].filter(Boolean).join(', ')}
        </p>
        <p className="font-mono-utility text-muted">#{b.short_code}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-display text-xl">{pence(b.total_pence ?? 0)}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => respond(false)} disabled={!!busy}>
            {busy === 'decline' ? 'Declining…' : 'Decline'}
          </Button>
          <Button onClick={() => respond(true)} disabled={!!busy}>
            {busy === 'accept' ? 'Accepting…' : 'Accept'}
          </Button>
        </div>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </Card>
  );
}
