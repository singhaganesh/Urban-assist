import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { sendNextOffer } from '@urban-assist/server-lib';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createServiceRole();

  try {
    // 1. Verify ownership of the booking
    const { data: booking, error: getErr } = await admin
      .from('bookings')
      .select('id, customer_id, status')
      .eq('id', params.id)
      .single();

    if (getErr || !booking) return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
    if (booking.customer_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    // 2. Clear previous offers for this booking
    await admin
      .from('booking_offers')
      .delete()
      .eq('booking_id', params.id);

    // 3. Update status back to pending_match
    const { error: updateErr } = await admin
      .from('bookings')
      .update({ status: 'pending_match', provider_id: null, matched_at: null })
      .eq('id', params.id);

    if (updateErr) throw updateErr;

    // 4. Trigger cascade
    await sendNextOffer(admin, params.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_retry' }, { status: 400 });
  }
}
