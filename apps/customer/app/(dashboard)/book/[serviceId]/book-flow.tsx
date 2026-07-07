'use client';
import * as React from 'react';
import { Button, Card, Field, Input, Textarea, Badge, RatingStars } from '@urban-assist/ui';
import { pence, quote, UK_POSTCODE_RE } from '@urban-assist/lib';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { CreditCard, Banknote, MapPin, Plus } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  is_default: boolean;
}

interface Service {
  id: string;
  title: string;
  price_pence: number;
  duration_mins: number;
  provider: { id: string; full_name: string; avatar_url: string | null; rating_avg: number; kyc_status: string };
  category: { name: string; slug: string };
}

type Step = 'when' | 'where' | 'pay' | 'review';

export function BookFlow({ service, addresses }: { service: Service; addresses: Address[] }) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('when');
  const [date, setDate] = React.useState(defaultSlot());
  const [addressId, setAddressId] = React.useState(addresses[0]?.id ?? '');
  const [adding, setAdding] = React.useState(addresses.length === 0);
  const [pay, setPay] = React.useState<'card' | 'cash'>('card');
  const [promo, setPromo] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Stripe checkout states
  const [paymentSecret, setPaymentSecret] = React.useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = React.useState<string | null>(null);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [payBusy, setPayBusy] = React.useState(false);
  const [stripeElements, setStripeElements] = React.useState<any>(null);
  const [cardElementRef, setCardElementRef] = React.useState<any>(null);

  React.useEffect(() => {
    if (!paymentSecret) return;
    let active = true;

    async function initStripe() {
      const stripe = await stripePromise;
      if (!stripe || !active) return;

      const elements = stripe.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '14px',
            color: '#1C2024',
            '::placeholder': { color: '#8B8D91' },
          },
        },
      });
      card.mount('#card-element');
      setStripeElements(stripe);
      setCardElementRef(card);
    }
    initStripe();

    return () => {
      active = false;
    };
  }, [paymentSecret]);

  async function confirmPayment() {
    if (!stripeElements || !cardElementRef || !paymentSecret || !createdBookingId) return;
    setPayBusy(true);
    setPayError(null);
    try {
      const { paymentIntent, error: payErr } = await stripeElements.confirmCardPayment(paymentSecret, {
        payment_method: {
          card: cardElementRef,
        },
      });
      if (payErr) {
        throw new Error(payErr.message ?? 'Payment failed');
      }
      if (paymentIntent?.status === 'succeeded') {
        router.replace(`/bookings/${createdBookingId}`);
      } else {
        throw new Error('Payment was not completed successfully.');
      }
    } catch (e: any) {
      setPayError(e.message);
    } finally {
      setPayBusy(false);
    }
  }

  const q = React.useMemo(
    () => quote(service.price_pence, null),
    [service.price_pence],
  );

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider_service_id: service.id,
          address_id: addressId,
          scheduled_at: new Date(date).toISOString(),
          payment_method: pay,
          promo_code: promo || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(typeof j.error === 'string' ? j.error : 'Could not create booking');
      }
      const data = await res.json();
      if (pay === 'card' && data.payment?.client_secret) {
        setPaymentSecret(data.payment.client_secret);
        setCreatedBookingId(data.booking.id);
      } else {
        router.replace(`/bookings/${data.booking.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 py-2 lg:grid lg:grid-cols-[1fr,320px] lg:gap-6 lg:space-y-0">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-hairline">
              {service.provider.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.provider.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{service.provider.full_name}</span>
                {service.provider.kyc_status === 'approved' && <Badge tone="success">Verified</Badge>}
              </div>
              <RatingStars value={Number(service.provider.rating_avg ?? 0)} />
            </div>
          </div>
          <div className="mt-3 text-sm text-muted">{service.title} — {service.duration_mins} min</div>
        </Card>

        <StepHeader step={step} setStep={setStep} />

        {step === 'when' && (
          <Card className="space-y-3">
            <Field label="When do you need this?">
              <Input
                type="datetime-local"
                value={date}
                min={isoNow()}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Anything we should know? (optional)">
              <Textarea
                rows={3}
                placeholder="Access codes, pets, parking — anything useful"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <Button onClick={() => setStep('where')} size="block">Next: address</Button>
          </Card>
        )}

        {step === 'where' && (
          <Card className="space-y-3">
            {addresses.length > 0 && !adding && (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${addressId === a.id ? 'border-ink' : 'border-hairline'}`}
                  >
                    <input
                      type="radio"
                      name="addr"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted" />
                        <span className="font-medium">{a.label}</span>
                      </div>
                      <div className="text-sm text-muted">
                        {[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 text-sm text-muted hover:text-ink"
                >
                  <Plus className="h-4 w-4" /> Add a new address
                </button>
              </div>
            )}
            {(adding || addresses.length === 0) && (
              <AddAddress
                onAdded={(id) => {
                  setAddressId(id);
                  setAdding(false);
                }}
                onCancel={addresses.length ? () => setAdding(false) : undefined}
              />
            )}
            <Button onClick={() => setStep('pay')} size="block" disabled={!addressId}>
              Next: payment
            </Button>
          </Card>
        )}

        {step === 'pay' && (
          <Card className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <PayOption
                active={pay === 'card'}
                onClick={() => setPay('card')}
                icon={<CreditCard className="h-4 w-4" />}
                title="Pay by card"
                hint="Settled when the job completes"
              />
              <PayOption
                active={pay === 'cash'}
                onClick={() => setPay('cash')}
                icon={<Banknote className="h-4 w-4" />}
                title="Cash on completion"
                hint="Pay your provider in cash on the day"
              />
            </div>
            <Field label="Promo code (optional)">
              <Input
                placeholder="e.g. WELCOME10"
                value={promo}
                onChange={(e) => setPromo(e.target.value.toUpperCase())}
              />
            </Field>
            <Button onClick={() => setStep('review')} size="block">Next: review</Button>
          </Card>
        )}

        {step === 'review' && (
          <Card className="space-y-4">
            <h3 className="font-display">Confirm booking</h3>
            <ul className="space-y-1 text-sm">
              <Row k="When" v={new Date(date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} />
              <Row k="Where" v={addresses.find((a) => a.id === addressId)?.label ?? 'Selected address'} />
              <Row k="Payment" v={pay === 'card' ? 'Card' : 'Cash on completion'} />
            </ul>
            {error && <p className="text-xs text-danger">{error}</p>}
            
            {!paymentSecret ? (
              <Button size="block" onClick={submit} disabled={submitting || !addressId}>
                {submitting ? 'Booking…' : `Confirm and pay ${pence(q.total_pence)}`}
              </Button>
            ) : (
              <div className="space-y-3 border border-hairline rounded-xl p-4 bg-bg/50 mt-3">
                <span className="font-mono-utility text-xs text-muted block mb-1">Enter Card Details</span>
                <div id="card-element" className="p-3.5 bg-white border border-hairline rounded-xl" />
                {payError && <p className="text-xs text-danger mt-1">{payError}</p>}
                <Button size="block" onClick={confirmPayment} disabled={payBusy}>
                  {payBusy ? 'Processing Payment…' : `Complete Payment ${pence(q.total_pence)}`}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className="space-y-2">
          <div className="font-display">Price breakdown</div>
          <ul className="space-y-1 text-sm">
            <Row k="Service" v={pence(q.net_pence)} />
            {q.discount_pence > 0 && <Row k="Discount" v={`-${pence(q.discount_pence)}`} />}
            <Row k="VAT (20%)" v={pence(q.vat_pence)} />
          </ul>
          <hr className="border-hairline" />
          <Row k="Total" v={pence(q.total_pence)} strong />
          <p className="font-mono-utility text-muted">Inc. VAT · GBP</p>
        </Card>
      </aside>
    </div>
  );
}

function StepHeader({ step, setStep }: { step: Step; setStep: (s: Step) => void }) {
  const steps: Step[] = ['when', 'where', 'pay', 'review'];
  return (
    <ol className="flex items-center gap-2 font-mono-utility text-muted">
      {steps.map((s, i) => (
        <li key={s}>
          <button
            onClick={() => setStep(s)}
            className={`rounded px-2 py-1 ${step === s ? 'bg-ink text-bg' : ''}`}
          >
            {String(i + 1).padStart(2, '0')} · {s}
          </button>
        </li>
      ))}
    </ol>
  );
}

function PayOption({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${active ? 'border-ink' : 'border-hairline'}`}
    >
      <span className="flex items-center gap-2 font-medium">{icon}{title}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <li className={`flex justify-between ${strong ? 'font-display text-lg' : ''}`}>
      <span className="text-muted">{k}</span>
      <span>{v}</span>
    </li>
  );
}

function AddAddress({
  onAdded,
  onCancel,
}: {
  onAdded: (id: string) => void;
  onCancel?: () => void;
}) {
  const [pc, setPc] = React.useState('');
  const [label, setLabel] = React.useState('Home');
  const [line1, setLine1] = React.useState('');
  const [city, setCity] = React.useState('');
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function lookup() {
    if (!UK_POSTCODE_RE.test(pc)) {
      setErr('Enter a valid UK postcode');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/postcode/${encodeURIComponent(pc)}`);
      if (!r.ok) throw new Error('Postcode not found');
      const j = await r.json();
      setLat(j.lat);
      setLng(j.lng);
      if (!city) setCity(j.admin_ward ?? '');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) throw new Error('Sign in required');
      const { data, error } = await supabase()
        .from('addresses')
        .insert({
          profile_id: user.id,
          label,
          line1,
          city,
          postcode: pc.toUpperCase(),
          lat,
          lng,
          is_default: true,
        })
        .select()
        .single();
      if (error) throw error;
      onAdded(data.id);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-hairline p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Postcode">
          <div className="flex gap-2">
            <Input value={pc} onChange={(e) => setPc(e.target.value.toUpperCase())} placeholder="EC1A 1BB" />
            <Button type="button" variant="outline" onClick={lookup} disabled={busy}>Find</Button>
          </div>
        </Field>
      </div>
      <Field label="Address line">
        <Input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Flat 3, 12 Example Street" />
      </Field>
      <Field label="Town / city">
        <Input value={city} onChange={(e) => setCity(e.target.value)} />
      </Field>
      {err && <p className="text-xs text-danger">{err}</p>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy || !pc || !line1 || !city}>
          {busy ? 'Saving…' : 'Save address'}
        </Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}

function defaultSlot() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function isoNow() {
  return new Date().toISOString().slice(0, 16);
}
