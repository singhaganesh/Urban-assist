import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';
import { createServiceRole } from '@urban-assist/db/server';
import { respondToOffer, track } from '@urban-assist/server-lib';

const Schema = z.object({
  accept: z.boolean(),
  decline_reason: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Use service role to allow the cascade to fan out (notifications + next offer).
  const admin = createServiceRole();
  try {
    const result = await respondToOffer(admin, {
      offerId: params.id,
      providerId: user.id,
      accept: parsed.data.accept,
      declineReason: parsed.data.decline_reason ?? undefined,
    });
    // Best-effort analytics.
    const { data: offer } = await admin
      .from('booking_offers')
      .select('booking_id')
      .eq('id', params.id)
      .single();
    if (offer) {
      await track(admin, user.id, {
        type: parsed.data.accept ? 'offer.accepted' : 'offer.declined',
        payload: { booking_id: offer.booking_id, provider_id: user.id },
      });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 400 });
  }
}
