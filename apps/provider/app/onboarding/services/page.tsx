import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@urban-assist/db/server';
import { ServicesEditor } from './services-editor';

export const dynamic = 'force-dynamic';

export default async function ServicesOnboarding() {
  const db = getSupabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: categories } = await db.from('service_categories').select('*').order('sort_order');
  const { data: mine } = await db.from('provider_services').select('*').eq('provider_id', user.id);
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <header>
        <p className="font-mono-utility text-muted">Step 2 of 2</p>
        <h1 className="font-display text-2xl">Services & pricing</h1>
        <p className="mt-2 text-sm text-muted">
          Pick the categories you cover. Prices must sit within the category's min/max band.
        </p>
      </header>
      <ServicesEditor categories={categories ?? []} mine={mine ?? []} />
    </div>
  );
}
