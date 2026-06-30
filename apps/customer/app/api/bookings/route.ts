// Booking creation. Auth required (RLS enforces customer_id = auth.uid()).
// Calculates price + VAT via packages/lib/pricing, kicks off matching cascade,
// returns Stripe PaymentIntent for card or null for cash.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { quote } from '@urban-assist/lib';
import { sendNextOffer, track, createBookingIntent } from '@urban-assist/server-lib';

const Schema = z.object({
  provider_service_id: z.string().uuid(),
  address_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  payment_method: z.enum(['card', 'cash']),
  promo_code: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getSupabaseServer().auth.getUser();
  if (!user.data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  // Service-role for matching cascade + analytics (bypasses RLS).
  const admin = createServiceRole();

  // 1. Resolve the chosen provider service to get the price.
  const { data: svc, error: svcErr } = await admin
    .from('provider_services')
    .select('id, provider_id, category_id, price_pence')
    .eq('id', body.provider_service_id)
    .eq('is_active', true)
    .single();
  if (svcErr || !svc) return NextResponse.json({ error: 'service_not_found' }, { status: 404 });

  // 2. Optional promo lookup.
  let promo = null as null | { id: string; discount_type: 'percent' | 'fixed'; discount_value: number };
  if (body.promo_code) {
    const { data: p } = await admin
      .from('promo_codes')
      .select('id, discount_type, discount_value, expires_at')
      .eq('code', body.promo_code.toUpperCase())
      .single();
    if (p && (!p.expires_at || new Date(p.expires_at) > new Date())) {
      promo = { id: p.id, discount_type: p.discount_type as any, discount_value: p.discount_value };
    }
  }

  const q = quote(svc.price_pence, promo);

  // 3. Insert the booking (RLS-checked).
  const { data: booking, error: bErr } = await getSupabaseServer()
    .from('bookings')
    .insert({
      customer_id: user.data.user.id,
      category_id: svc.category_id,
      provider_service_id: svc.id,
      address_id: body.address_id,
      scheduled_at: body.scheduled_at,
      status: 'pending_match',
      price_pence: q.subtotal_pence,
      vat_pence: q.vat_pence,
      total_pence: q.total_pence,
      payment_method: body.payment_method,
      promo_code_id: promo?.id ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();
  if (bErr || !booking) return NextResponse.json({ error: bErr?.message ?? 'insert_failed' }, { status: 400 });

  // 4. Kick off matching cascade (service-role to bypass RLS).
  try {
    await sendNextOffer(admin, booking.id);
  } catch (e) {
    console.error('[matching] cascade failed', e);
  }

  // 5. Payment.
  let clientSecret: string | null = null;
  if (body.payment_method === 'card') {
    const pi = await createBookingIntent({
      bookingId: booking.id,
      customerId: user.data.user.id,
      amountPence: q.total_pence,
      description: `HomeEase booking ${booking.short_code}`,
    });
    await admin.from('payments').insert({
      booking_id: booking.id,
      method: 'card',
      stripe_payment_intent_id: pi.id,
      amount_pence: q.total_pence,
      vat_pence: q.vat_pence,
      status: 'pending',
    });
    clientSecret = pi.client_secret;
  } else {
    await admin.from('payments').insert({
      booking_id: booking.id,
      method: 'cash',
      amount_pence: q.total_pence,
      vat_pence: q.vat_pence,
      status: 'pending',
    });
  }

  await track(admin, user.data.user.id, { type: 'booking.created', payload: { booking_id: booking.id } });

  return NextResponse.json({
    booking,
    payment: { method: body.payment_method, client_secret: clientSecret },
  });
}
