import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { booking_id, content } = await req.json();
  if (!booking_id || !content) return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  const { data, error } = await db
    .from('messages')
    .insert({ booking_id, sender_id: user.id, content })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
