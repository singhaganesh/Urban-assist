'use client';
import * as React from 'react';
import { Card, Button, Badge, Field, Input } from '@urban-assist/ui';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { formatUkPhone } from '@urban-assist/lib';
import { User, Gift, MapPin, Heart, Shield, HelpCircle } from 'lucide-react';

interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  postcode: string;
}

interface Favorite {
  provider_id: string;
  provider: {
    full_name: string;
    rating_avg: number;
  };
}

export default function AccountPage() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);
  const [profile, setProfile] = React.useState<any>(null);
  const [addresses, setAddresses] = React.useState<Address[]>([]);
  const [favorites, setFavorites] = React.useState<Favorite[]>([]);
  const [referralCode, setReferralCode] = React.useState<string | null>(null);

  // Profile Form States
  const [fullName, setFullName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileOk, setProfileOk] = React.useState<string | null>(null);

  // GDPR action states
  const [gdprProgress, setGdprProgress] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const sb = supabase();
        const { data: { user: authUser } } = await sb.auth.getUser();
        if (!authUser) return;
        setUser(authUser);

        // Fetch profile
        const { data: p } = await sb.from('profiles').select('*').eq('id', authUser.id).single();
        if (p) {
          setProfile(p);
          setFullName(p.full_name ?? '');
          setPhone(p.phone ?? '');
        }

        // Fetch addresses
        const { data: addr } = await sb.from('addresses').select('*').eq('profile_id', authUser.id);
        setAddresses(addr ?? []);

        // Fetch favorites
        const { data: favs } = await sb
          .from('favorites')
          .select('provider_id, provider:profiles!favorites_provider_id_fkey(full_name,rating_avg)')
          .eq('customer_id', authUser.id);
        setFavorites(favs as any ?? []);

        // Fetch or create referral code
        let { data: ref } = await sb.from('referrals').select('code').eq('owner_id', authUser.id).maybeSingle();
        if (!ref) {
          const generatedCode = `EASE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const { data: newRef } = await sb
            .from('referrals')
            .insert({ owner_id: authUser.id, code: generatedCode, credit_pence: 500 })
            .select('code')
            .single();
          ref = newRef;
        }
        setReferralCode(ref?.code ?? null);
      } catch (err) {
        console.error('Failed to load customer account details', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(null);
    setProfileBusy(true);

    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      if (cleanPhone && !cleanPhone.startsWith('+44') && !cleanPhone.startsWith('0')) {
        throw new Error('Enter a valid UK phone number starting with +44 or 0');
      }

      const formattedPhone = cleanPhone ? formatUkPhone(cleanPhone) : '';

      const sb = supabase();
      const { error } = await sb
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: formattedPhone,
        })
        .eq('id', user.id);

      if (error) throw error;
      setProfileOk('Profile updated successfully.');
      setProfile({ ...profile, full_name: fullName.trim(), phone: formattedPhone });
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileBusy(false);
    }
  }

  async function triggerGdprExport() {
    setGdprProgress('Preparing data export. You will receive an email shortly.');
    setTimeout(() => setGdprProgress(null), 4000);
  }

  async function triggerGdprDeletion() {
    if (confirm('Are you sure you want to request account deletion? This action is irreversible.')) {
      setGdprProgress('Account deletion request submitted. Our compliance officer will contact you.');
      setTimeout(() => setGdprProgress(null), 4000);
    }
  }

  async function handleLogout() {
    await supabase().auth.signOut();
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-hairline rounded" />
        <div className="h-64 bg-hairline rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <h1 className="font-display text-xl">Account</h1>

      {/* Edit Profile Form */}
      <Card>
        <form onSubmit={handleProfileUpdate} className="space-y-3">
          <h3 className="font-display text-sm font-semibold flex items-center gap-1">
            <User className="h-4 w-4 text-muted" /> Profile settings
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Full name">
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Phone number">
              <Input
                type="tel"
                placeholder="e.g. +44 7123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Email Address">
            <Input disabled value={user?.email} />
          </Field>
          {profileError && <p className="text-xs text-danger">{profileError}</p>}
          {profileOk && <p className="text-xs text-success">{profileOk}</p>}
          <Button type="submit" disabled={profileBusy}>
            {profileBusy ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>

      {/* Referrals Code display */}
      <Card className="bg-accent/5 border-accent/20 flex flex-col justify-between p-5 gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/25 text-[color:rgb(var(--accent))] shrink-0">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <div className="font-medium">Share the love, get £5</div>
            <p className="text-xs text-muted mt-0.5">
              Give friends £5 off their first booking. You'll get £5 in credit when they complete their service.
            </p>
          </div>
        </div>
        {referralCode && (
          <div className="flex items-center justify-between gap-3 bg-white border border-hairline p-3 rounded-xl">
            <span className="font-mono-utility text-sm font-bold text-ink select-all">{referralCode}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(referralCode);
                alert('Referral code copied to clipboard!');
              }}
            >
              Copy Code
            </Button>
          </div>
        )}
      </Card>

      {/* Saved Addresses list */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted" /> Saved addresses
          </h3>
          <Badge tone="muted">{addresses.length}</Badge>
        </div>
        {addresses.length ? (
          <ul className="space-y-2 text-sm">
            {addresses.map((a) => (
              <li key={a.id} className="text-xs sm:text-sm">
                <span className="font-medium">{a.label}</span>
                <span className="text-muted"> — {[a.line1, a.city, a.postcode].filter(Boolean).join(', ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No saved addresses yet. Add one during checkout.</p>
        )}
      </Card>

      {/* Favourites / Saved Providers */}
      <Card className="space-y-2">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-muted text-danger" /> Saved Providers
        </h3>
        {favorites.length ? (
          <ul className="space-y-2 text-sm">
            {favorites.map((f) => (
              <li key={f.provider_id} className="flex justify-between items-center bg-bg/30 p-2.5 rounded-xl border border-hairline">
                <div>
                  <span className="font-medium text-xs sm:text-sm">{f.provider?.full_name}</span>
                  <span className="text-xs text-muted block mt-0.5">★ {Number(f.provider?.rating_avg ?? 0).toFixed(1)}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => window.location.href = `/browse?q=${encodeURIComponent(f.provider?.full_name ?? '')}`}>
                  Book
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">No saved providers. Heart a provider to pin them here.</p>
        )}
      </Card>

      {/* GDPR privacy & request stubs */}
      <Card className="space-y-2">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-muted" /> GDPR Data Controls
        </h3>
        <p className="text-xs text-muted">
          Under UK GDPR legislation, you can request an export of all your transaction and chat histories, or request permanent account erasure.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={triggerGdprExport}>
            Export My Data
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-danger" onClick={triggerGdprDeletion}>
            Delete Account
          </Button>
        </div>
        {gdprProgress && <p className="text-xs text-accent mt-2">{gdprProgress}</p>}
      </Card>

      {/* FAQ/Terms list */}
      <Card className="space-y-2">
        <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-muted" /> Help & Support
        </h3>
        <ul className="space-y-1 text-xs sm:text-sm">
          <li><a className="underline text-muted hover:text-ink" href="/help">Frequently Asked Questions</a></li>
          <li><a className="underline text-muted hover:text-ink" href="/terms">Terms of Service</a></li>
          <li><a className="underline text-muted hover:text-ink" href="/privacy">Privacy Policy</a></li>
        </ul>
      </Card>

      {/* Logout button */}
      <Button variant="outline" size="block" onClick={handleLogout} className="mt-4">
        Logout
      </Button>
    </div>
  );
}

