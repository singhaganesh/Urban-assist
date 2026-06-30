import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { BookFlow } from './book-flow';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: { params: { serviceId: string } }) {
  const db = getSupabaseServer();
  const { data: service } = await db
    .from('provider_services')
    .select('id, title, price_pence, duration_mins, provider:profiles!inner(id, full_name, avatar_url, rating_avg, kyc_status), category:service_categories!inner(name, slug)')
    .eq('id', params.serviceId)
    .single();
  if (!service) return notFound();

  const { data: { user } } = await db.auth.getUser();
  const { data: addresses } = user
    ? await db.from('addresses').select('*').eq('profile_id', user.id).order('is_default', { ascending: false })
    : { data: [] as any[] };

  return <BookFlow service={service as any} addresses={addresses ?? []} />;
}
