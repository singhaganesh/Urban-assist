// Self-service support tickets. With no admin inbox in V1,
// also fire a webhook/email if configured (placeholder).
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@urban-assist/db/server';

const Schema = z.object({
  booking_id: z.string().uuid().optional().nullable(),
  category: z.string().min(2).max(60),
  description: z.string().min(10).max(2000),
});

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await db
    .from('support_tickets')
    .insert({
      raised_by: user.id,
      booking_id: parsed.data.booking_id ?? null,
      category: parsed.data.category,
      description: parsed.data.description,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const hook = process.env.SUPPORT_NOTIFICATION_WEBHOOK;
  if (hook) {
    fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket: data, user: user.email }),
    }).catch(() => null);
  }
  return NextResponse.json(data);
}
