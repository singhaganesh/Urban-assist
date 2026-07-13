import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer, createServiceRole } from '@urban-assist/db/server';
import { updateJobStatus } from '@urban-assist/domain';
import { sendPush } from '@urban-assist/integrations/firebase';

const PUSH_COPY: Record<string, { title: string; body: string }> = {
  on_the_way: { title: 'On the way', body: 'Your professional is on the way to you now.' },
  arrived: { title: 'Professional arrived', body: 'Your professional has arrived. Share your start code to begin.' },
  in_progress: { title: 'Job started', body: 'Work on your booking has started.' },
  completed: { title: 'Job completed', body: 'Your booking is complete. Tap to rate your experience.' },
  cancelled: { title: 'Booking cancelled', body: 'Your professional had to cancel. We’re sorry — please rebook.' },
};

const Schema = z.object({
  status: z.enum(['on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled']),
  cancellation_reason: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: { user } } = await getSupabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await updateJobStatus(getSupabaseServer(), {
      bookingId: params.id,
      providerId: user.id,
      status: parsed.data.status,
      cancellationReason: parsed.data.cancellation_reason,
    });
    const copy = PUSH_COPY[parsed.data.status];
    if (copy && data?.customer_id) {
      // service role: reading the customer's fcm_tokens crosses RLS
      await sendPush(createServiceRole(), data.customer_id, {
        ...copy,
        data: { booking_id: params.id, link: `/bookings/${params.id}` },
      }).catch((e) => console.warn('[urban-assist] push failed:', e.message));
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
