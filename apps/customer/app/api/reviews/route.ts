import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { track } from '@urban-assist/server-lib';

const Schema = z.object({
  booking_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const { data: booking } = await db
    .from('bookings')
    .select('id, customer_id, provider_id, status')
    .eq('id', body.booking_id)
    .single();
  if (!booking) return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'booking_not_completed' }, { status: 400 });
  }

  const isCustomer = booking.customer_id === user.id;
  const isProvider = booking.provider_id === user.id;
  if (!isCustomer && !isProvider) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const targetId = isCustomer ? booking.provider_id! : booking.customer_id;
  const direction = isCustomer ? 'customer_to_provider' : 'provider_to_customer';

  const { error } = await db.from('reviews').insert({
    booking_id: booking.id,
    author_id: user.id,
    target_id: targetId,
    direction,
    rating: body.rating,
    comment: body.comment ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await track(createServiceRole(), user.id, {
    type: 'review.submitted',
    payload: { booking_id: booking.id, rating: body.rating },
  });
  return NextResponse.json({ ok: true });
}

