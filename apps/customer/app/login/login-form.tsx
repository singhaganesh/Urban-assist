'use client';
import * as React from 'react';
import { Button, Field, Input, Card } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'otp' | 'set-password';
type Country = {
  code: 'GB' | 'IN';
  dial: string;
  name: string;
  flag: string;
  placeholder: string;
  validate: (val: string) => boolean;
};

const COUNTRIES: Country[] = [
  {
    code: 'GB',
    dial: '+44',
    name: 'UK',
    flag: '🇬🇧',
    placeholder: '7123 456789',
    validate: (val: string) => /^7\d{9}$/.test(val),
  },
  {
    code: 'IN',
    dial: '+91',
    name: 'India',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    validate: (val: string) => /^[6-9]\d{9}$/.test(val),
  },
];

export function LoginForm() {
  const [mode, setMode] = React.useState<Mode>('login');
  const [phase, setPhase] = React.useState<'enter' | 'otp'>('enter');

  // Phone components
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(COUNTRIES[0]);
  const [phoneVal, setPhoneVal] = React.useState('');

  // Login credentials
  const [password, setPassword] = React.useState('');

  // OTP code
  const [otp, setOtp] = React.useState('');

  // Password creation credentials
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Clean and format phone number
  const cleanNationalNumber = (num: string) => {
    const raw = num.replace(/\D/g, '');
    return raw.startsWith('0') ? raw.slice(1) : raw;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneVal(cleanNationalNumber(e.target.value));
  };

  const getFullE164 = () => {
    return `${selectedCountry.dial}${phoneVal}`;
  };

  // 1. Password Login Action
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedCountry.validate(phoneVal)) {
      setError(`Invalid mobile number format for ${selectedCountry.name}.`);
      return;
    }

    setLoading(true);
    try {
      const sb = supabase();
      const e164 = getFullE164();
      const { error } = await sb.auth.signInWithPassword({
        phone: e164,
        password,
      });
      if (error) throw error;
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Invalid phone number or password');
    } finally {
      setLoading(false);
    }
  }

  // 2. Send SMS OTP Action
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedCountry.validate(phoneVal)) {
      setError(`Invalid mobile number format for ${selectedCountry.name}.`);
      return;
    }

    setLoading(true);
    try {
      const e164 = getFullE164();
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'phone', value: e164 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Could not send verification code');
      }
      setPhase('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. Verify OTP Action
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = supabase();
      const e164 = getFullE164();
      const { error } = await sb.auth.verifyOtp({
        phone: e164,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;

      // Successfully authenticated via OTP! Now prompt user to set password
      setMode('set-password');
    } catch (err: any) {
      setError(err.message ?? 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  // 4. Create Password Action
  async function handleCreatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const sb = supabase();
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Could not save password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      {/* 1. PASSWORD LOGIN MODE */}
      {mode === 'login' && (
        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <Field label="Mobile phone number">
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const found = COUNTRIES.find((c) => c.code === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="rounded-lg border border-input bg-card px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
              <Input
                autoFocus
                required
                type="tel"
                placeholder={selectedCountry.placeholder}
                value={phoneVal}
                onChange={handlePhoneChange}
                className="flex-1"
              />
            </div>
          </Field>
          <Field label="Password">
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading || !phoneVal || !password}>
            {loading ? 'Logging in…' : 'Log in'}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('otp');
                setPhase('enter');
                setError(null);
              }}
              className="text-xs font-medium text-accent hover:underline"
            >
              New user? Register or reset with SMS OTP
            </button>
          </div>
        </form>
      )}

      {/* 2. SMS OTP MODE */}
      {mode === 'otp' && (
        <>
          {phase === 'enter' ? (
            /* Enter Phone Screen */
            <form onSubmit={handleSendOtp} className="space-y-3">
              <Field label="Register / Reset via Mobile OTP">
                <div className="flex gap-2">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                    className="rounded-lg border border-input bg-card px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <Input
                    autoFocus
                    required
                    type="tel"
                    placeholder={selectedCountry.placeholder}
                    value={phoneVal}
                    onChange={handlePhoneChange}
                    className="flex-1"
                  />
                </div>
              </Field>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button size="block" type="submit" disabled={loading || !phoneVal}>
                {loading ? 'Sending…' : 'Send verification code'}
              </Button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs font-medium text-muted hover:underline"
                >
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            /* Enter OTP Verification Code Screen */
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <Field label="6-digit code" hint={`Sent to ${selectedCountry.dial} ${phoneVal}`}>
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
                Use a different phone number
              </button>
            </form>
          )}
        </>
      )}

      {/* 3. SET PASSWORD MODE */}
      {mode === 'set-password' && (
        <form onSubmit={handleCreatePassword} className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-ink">Set Account Password</h3>
            <p className="text-xs text-muted">
              Create a password so you can log in directly using your phone number next time.
            </p>
          </div>
          <Field label="Create Password">
            <Input
              autoFocus
              required
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm Password">
            <Input
              required
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button size="block" type="submit" disabled={loading || !newPassword || !confirmPassword}>
            {loading ? 'Saving…' : 'Create password & finish'}
          </Button>
        </form>
      )}
    </Card>
  );
}
