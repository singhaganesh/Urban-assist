import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { rescheduleBooking } from '@urban-assist/domain';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body?.scheduled_at !== 'string') {
    return NextResponse.json({ error: 'invalid_time' }, { status: 400 });
  }

  try {
    await rescheduleBooking(createServiceRole(), {
      bookingId: params.id,
      userId: user.id,
      scheduledAt: body.scheduled_at,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e.message === 'forbidden' ? 403 : e.message === 'booking_not_found' ? 404 : 400;
    return NextResponse.json({ error: e.message ?? 'failed_to_reschedule' }, { status });
  }
}
