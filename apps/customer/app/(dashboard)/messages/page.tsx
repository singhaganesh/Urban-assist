import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { MessagesClient } from './messages-client';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  const { data: bookings } = await db
    .from('bookings')
    .select('id, short_code, status, provider:profiles!bookings_provider_id_fkey(id,full_name,avatar_url,phone), category:service_categories(name), messages(id,sender_id,content,created_at)')
    .eq('customer_id', user.id)
    .in('status', ['assigned', 'on_the_way', 'arrived', 'in_progress', 'completed'])
    .order('scheduled_at', { ascending: false })
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .limit(20);

  const list = (bookings ?? []).filter((b: any) => b.provider);

  return <MessagesClient conversations={list as any[]} userId={user.id} />;
}
