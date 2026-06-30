import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@urban-assist/db/server';

export async function POST() {
  const db = getSupabaseServer();
  await db.auth.signOut();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'));
}
