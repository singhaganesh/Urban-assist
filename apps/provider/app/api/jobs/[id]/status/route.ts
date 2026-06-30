import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';

const Schema = z.object({
  status: z.enum(['on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled']),
  cancellation_reason: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const patch: Record<string, any> = { status: parsed.data.status };
  const now = new Date().toISOString();
  if (parsed.data.status === 'in_progress') patch.started_at = now;
  if (parsed.data.status === 'completed') patch.completed_at = now;
  if (parsed.data.status === 'cancelled') {
    patch.cancelled_at = now;
    patch.cancellation_reason = parsed.data.cancellation_reason ?? null;
  }

  const { data, error } = await db
    .from('bookings')
    .update(patch)
    .eq('id', params.id)
    .eq('provider_id', user.id) // RLS belt-and-braces
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
