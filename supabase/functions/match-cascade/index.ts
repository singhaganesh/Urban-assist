// Supabase Edge Function: match-cascade
// Triggered by:
//   - On booking insert (via DB webhook → /functions/v1/match-cascade)
//   - Scheduled (cron / QStash) to expire stale offers
//
// Deploy: supabase functions deploy match-cascade --no-verify-jwt
// Cron:   `* * * * *` (every minute) — see supabase/config.toml

// @ts-expect-error Deno globals
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TTL = 90;

const db = createClient(SUPABASE_URL, SERVICE, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'tick';

  if (mode === 'kickoff') {
    const { booking_id } = await req.json();
    await sendNext(booking_id);
    return new Response('ok');
  }

  // Default tick: expire stale offers + cascade.
  const { data: stale } = await db
    .from('booking_offers')
    .select('id, booking_id')
    .eq('status', 'pending')
    .lt('responds_by', new Date().toISOString());

  for (const offer of stale ?? []) {
    await db
      .from('booking_offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', offer.id);
    await sendNext(offer.booking_id);
  }

  return new Response(JSON.stringify({ expired: stale?.length ?? 0 }), {
    headers: { 'content-type': 'application/json' },
  });
});

async function sendNext(bookingId: string) {
  // Inlined version of packages/lib/matching.ts/sendNextOffer — Edge can't import workspace pkgs.
  const { data: booking } = await db
    .from('bookings')
    .select('id, category_id, address_id, addresses!inner(lat,lng)')
    .eq('id', bookingId)
    .single();
  if (!booking) return;
  const lat = (booking as any).addresses?.lat ?? 51.5074;
  const lng = (booking as any).addresses?.lng ?? -0.1278;

  const { data: services } = await db
    .from('provider_services')
    .select('provider_id, profiles!inner(is_online,rating_avg,acceptance_rate,kyc_status)')
    .eq('category_id', (booking as any).category_id)
    .eq('is_active', true);
  if (!services?.length) {
    await db.from('bookings').update({ status: 'unmatched' }).eq('id', bookingId);
    return;
  }
  const ids = services.map((s: any) => s.provider_id);
  const { data: locs } = await db
    .from('provider_location')
    .select('provider_id, lat, lng')
    .in('provider_id', ids);
  const locMap = new Map((locs ?? []).map((l: any) => [l.provider_id, l]));

  const { data: prev } = await db
    .from('booking_offers')
    .select('provider_id')
    .eq('booking_id', bookingId);
  const seen = new Set((prev ?? []).map((o: any) => o.provider_id));

  const cands = (services as any[])
    .filter((s) => s.profiles?.is_online && s.profiles?.kyc_status === 'approved' && !seen.has(s.provider_id))
    .map((s) => {
      const loc = locMap.get(s.provider_id);
      const distance_km = loc ? hav(lat, lng, loc.lat, loc.lng) : 10;
      const distScore = Math.max(0, 1 - distance_km / 15);
      const rating = Number(s.profiles.rating_avg ?? 0) / 5;
      const accept = Number(s.profiles.acceptance_rate ?? 1);
      return { id: s.provider_id, score: distScore * 0.5 + rating * 0.3 + accept * 0.2 };
    })
    .sort((a, b) => b.score - a.score);

  if (!cands.length) {
    await db.from('bookings').update({ status: 'unmatched' }).eq('id', bookingId);
    return;
  }

  const { count } = await db
    .from('booking_offers')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId);

  const respondsBy = new Date(Date.now() + TTL * 1000).toISOString();
  const { data: offer } = await db
    .from('booking_offers')
    .insert({
      booking_id: bookingId,
      provider_id: cands[0].id,
      rank: (count ?? 0) + 1,
      responds_by: respondsBy,
      status: 'pending',
    })
    .select()
    .single();

  await db.from('notifications').insert({
    profile_id: cands[0].id,
    type: 'offer.new',
    payload: { booking_id: bookingId, offer_id: offer?.id, responds_by: respondsBy },
  });
}

function hav(a: number, b: number, c: number, d: number) {
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const lat1 = (a * Math.PI) / 180;
  const lat2 = (c * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
