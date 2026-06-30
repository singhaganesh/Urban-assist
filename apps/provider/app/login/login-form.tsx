'use client';
import * as React from 'react';
import { Button, Card, Field, Input } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<'enter' | 'otp'>('enter');
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      // signInWithOtp with metadata.role=provider so the trigger creates the right profile.
      const { error } = await supabase().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data: { role: 'provider' } },
      });
      if (error) throw error;
      setPhase('otp');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase().auth.verifyOtp({ email, token: otp, type: 'email' });
      if (error) throw error;
      // Ensure role is provider (in case profile was pre-existing as customer).
      const { data: { user } } = await supabase().auth.getUser();
      if (user) {
        await supabase().from('profiles').update({ role: 'provider' }).eq('id', user.id);
      }
      router.replace('/');
    } catch (e: any) {
      setErr(e.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      {phase === 'enter' ? (
        <form onSubmit={send} className="space-y-3">
          <Field label="Work email">
            <Input
              type="email"
              autoFocus
              required
              placeholder="you@yourtrade.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {err && <p className="text-xs text-danger">{err}</p>}
          <Button size="block" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <Field label="6-digit code" hint={`Sent to ${email}`}>
            <Input
              autoFocus
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          {err && <p className="text-xs text-danger">{err}</p>}
          <Button size="block" type="submit" disabled={busy || otp.length < 6}>
            {busy ? 'Verifying…' : 'Verify and continue'}
          </Button>
        </form>
      )}
    </Card>
  );
}

