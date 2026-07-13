'use client';
import * as React from 'react';
import { Button, Card, Field, Input, Textarea, Badge, RatingStars } from '@urban-assist/ui';
import { pence, quote, UK_POSTCODE_RE } from '@urban-assist/lib';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser as supabase } from '@urban-assist/db/browser';
import { CreditCard, Banknote, MapPin, Plus } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { AddressForm } from '../../../../components/address-form';

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
        router.replace(`/book/success?id=${createdBookingId}`);
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
        router.replace(`/book/success?id=${data.booking.id}`);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 py-2 pb-24 lg:grid lg:grid-cols-[1fr,320px] lg:gap-6 lg:space-y-0 lg:pb-0">
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
              <AddressForm
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

      {/* Sticky Bottom CTA for Mobile Checkout */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted">Total</div>
            <div className="text-[17px] font-extrabold leading-tight text-ink">{pence(q.total_pence)}</div>
          </div>
          {step !== 'review' ? (
            <Button
              onClick={() => {
                if (step === 'when') setStep('where');
                else if (step === 'where') setStep('pay');
                else if (step === 'pay') setStep('review');
              }}
              disabled={step === 'where' && !addressId}
              className="px-8"
            >
              Next
            </Button>
          ) : !paymentSecret ? (
            <Button
              onClick={submit}
              disabled={submitting || !addressId}
              className="px-8"
            >
              {submitting ? 'Booking…' : 'Confirm & Pay'}
            </Button>
          ) : (
            <Button
              onClick={confirmPayment}
              disabled={payBusy}
              className="px-8"
            >
              {payBusy ? 'Processing…' : 'Pay'}
            </Button>
          )}
        </div>
      </div>
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

// AddressForm extracted to components/address-form.tsx (shared with account page).

function defaultSlot() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function isoNow() {
  return new Date().toISOString().slice(0, 16);
}
