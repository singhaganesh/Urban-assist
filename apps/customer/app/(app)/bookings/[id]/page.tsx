import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { BookingDetail } from './booking-detail';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params }: { params: { id: string } }) {
  const db = getSupabaseServer();
  const { data: booking } = await db
    .from('bookings')
    .select('*, category:service_categories(name,slug), address:addresses(*), provider:profiles!bookings_provider_id_fkey(id,full_name,avatar_url,rating_avg,phone)')
    .eq('id', params.id)
    .single();
  if (!booking) return notFound();
  const { data: payment } = await db
    .from('payments')
    .select('*')
    .eq('booking_id', params.id)
    .single();
  return <BookingDetail booking={booking as any} payment={payment as any} />;
}
