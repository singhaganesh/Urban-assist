'use client';
import * as React from 'react';
import { Button, Field, Input, Card } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter } from 'next/navigation';

type Mode = 'email' | 'phone';

export function LoginForm() {
  const [mode, setMode] = React.useState<Mode>('email');
  const [phase, setPhase] = React.useState<'enter' | 'otp'>('enter');
  const [value, setValue] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not send code');
      }
      setPhase('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = supabase();
      const { error } =
        mode === 'email'
          ? await sb.auth.verifyOtp({ email: value, token: otp, type: 'email' })
          : await sb.auth.verifyOtp({ phone: value, token: otp, type: 'sms' });
      if (error) throw error;
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-bg p-1">
        {(['email', 'phone'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setPhase('enter');
              setValue('');
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === m ? 'bg-white shadow-hairline' : 'text-muted'
            }`}
          >
            {m === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>

      {phase === 'enter' ? (
        <form onSubmit={sendCode} className="space-y-3">
          <Field label={mode === 'email' ? 'Email address' : 'Mobile (+44)'}>
            <Input
              autoFocus
              required
              type={mode === 'email' ? 'email' : 'tel'}
              placeholder={mode === 'email' ? 'you@example.co.uk' : '+44 7…'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <Field label="6-digit code" hint={`Sent to ${value}`}>
            <Input
              autoFocus
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading || otp.length < 6}>
            {loading ? 'Verifying…' : 'Verify and continue'}
          </Button>
          <button
            type="button"
            onClick={() => setPhase('enter')}
            className="w-full text-xs text-muted hover:text-ink"
          >
            Use a different {mode}
          </button>
        </form>
      )}
    </Card>
  );
}

