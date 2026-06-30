import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';
import { stripe } from '@urban-assist/server-lib';

export async function POST(req: NextRequest) {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { data: profile, error } = await db
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (error || !profile?.stripe_account_id) {
      throw error ?? new Error('Stripe account not connected');
    }

    const link = await stripe().accounts.createLoginLink(profile.stripe_account_id);
    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'failed_to_create_dashboard_link' }, { status: 400 });
  }
}

