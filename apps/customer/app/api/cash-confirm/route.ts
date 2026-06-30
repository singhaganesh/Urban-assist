// Both sides confirm cash collection. Booking is marked paid once
// either party flips it (provider in practice; customer can corroborate).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { track } from '@urban-assist/server-lib';

const Schema = z.object({ booking_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: payment } = await db
    .from('payments')
    .select('id, booking_id, method, status, bookings!inner(customer_id, provider_id)')
    .eq('booking_id', parsed.data.booking_id)
    .single();
  if (!payment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const b = (payment as any).bookings;
  if (user.id !== b.customer_id && user.id !== b.provider_id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (payment.method !== 'cash') {
    return NextResponse.json({ error: 'not_cash' }, { status: 400 });
  }
  await db
    .from('payments')
    .update({ status: 'succeeded', cash_collected_at: new Date().toISOString() })
    .eq('id', payment.id);
  await track(createServiceRole(), user.id, {
    type: 'cash.collected',
    payload: { booking_id: parsed.data.booking_id },
  });
  return NextResponse.json({ ok: true });
}

