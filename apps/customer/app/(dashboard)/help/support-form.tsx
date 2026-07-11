'use client';
import * as React from 'react';
import { Button, Card, Field, Input, Textarea } from '@urban-assist/ui';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Booking issue', 'Payment or refund', 'Service quality', 'Account', 'Other'];

export function SupportForm() {
  const router = useRouter();
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [description, setDescription] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category, description }),
      });
      if (!res.ok) throw new Error('Could not submit — check your message is at least 10 characters.');
      setSent(true);
      setDescription('');
      router.refresh(); // re-fetch the server-rendered ticket list
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Card className="space-y-2">
        <p className="text-sm font-medium text-success">Ticket submitted — we'll get back to you by email.</p>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>Raise another</Button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <Field label="What's it about?">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="tap w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Describe the problem" hint="Include your booking code (e.g. #UA-1234) if it's about a booking.">
          <Textarea
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened…"
          />
        </Field>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="submit" disabled={busy || description.trim().length < 10}>
          {busy ? 'Submitting…' : 'Submit ticket'}
        </Button>
      </form>
    </Card>
  );
}
