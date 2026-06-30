// Automatic job-matching cascade. Replaces manual admin dispatch (§9).
//
// Lifecycle per booking:
//   pending_match → offer top-ranked provider (TTL 90s)
//     ↳ accept   → status = assigned
//     ↳ decline  → cascade to next candidate
//     ↳ expire   → cascade to next candidate
//   no candidates → status = unmatched
//
// Triggered from:
//   - POST /api/bookings           (initial offer)
//   - PATCH /api/offers/:id        (provider response)
//   - Supabase Edge Function `match-cascade` (cron / QStash for TTL expiry)

import type { SupabaseClient } from '@supabase/supabase-js';
import { setActiveOffer, clearActiveOffer } from './redis';

export const OFFER_TTL_SECONDS = 90;

interface Candidate {
  provider_id: string;
  distance_km: number;
  rating: number;
  acceptance_rate: number;
}

/**
 * Score a candidate. Higher = better.
 * Weights: distance 0.5, rating 0.3, acceptance 0.2.
 * Distance score is 1 at 0 km, 0 at 15 km, linear.
 */
function score(c: Candidate): number {
  const distScore = Math.max(0, 1 - c.distance_km / 15);
  const ratingScore = c.rating / 5;
  return distScore * 0.5 + ratingScore * 0.3 + c.acceptance_rate * 0.2;
}

/** Find ranked candidates for a booking. Pure DB read — uses service role. */
export async function findCandidates(
  db: SupabaseClient,
  bookingId: string,
): Promise<Candidate[]> {
  // 1. Resolve booking + address.
  const { data: booking, error: bErr } = await db
    .from('bookings')
    .select('id, category_id, address_id, scheduled_at, addresses!inner(lat,lng)')
    .eq('id', bookingId)
    .single();
  if (bErr || !booking) throw bErr ?? new Error('booking_not_found');

  const addr = (booking as any).addresses;
  const lat = addr?.lat ?? 51.5074;
  const lng = addr?.lng ?? -0.1278;

  // 2. Eligible providers: online + offering this category + not blocked.
  const { data: services } = await db
    .from('provider_services')
    .select('provider_id, profiles!inner(id,is_online,rating_avg,acceptance_rate,kyc_status)')
    .eq('category_id', (booking as any).category_id)
    .eq('is_active', true);

  if (!services?.length) return [];

  // 3. Last known provider location.
  const ids = services.map((s) => s.provider_id);
  const { data: locs } = await db
    .from('provider_location')
    .select('provider_id, lat, lng')
    .in('provider_id', ids);

  const locMap = new Map(locs?.map((l) => [l.provider_id, l]) ?? []);

  // 4. Exclude providers already offered/assigned this booking.
  const { data: prevOffers } = await db
    .from('booking_offers')
    .select('provider_id')
    .eq('booking_id', bookingId);
  const seen = new Set(prevOffers?.map((o) => o.provider_id) ?? []);

  const candidates: Candidate[] = [];
  for (const s of services) {
    const p: any = s.profiles;
    if (!p?.is_online || p.kyc_status !== 'approved') continue;
    if (seen.has(s.provider_id)) continue;
    const loc = locMap.get(s.provider_id);
    const distance_km = loc ? haversineKm(lat, lng, loc.lat, loc.lng) : 10;
    candidates.push({
      provider_id: s.provider_id,
      distance_km,
      rating: Number(p.rating_avg ?? 0),
      acceptance_rate: Number(p.acceptance_rate ?? 1),
    });
  }
  return candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, 20); // cap cascade depth
}

/** Send the next offer in the cascade. Returns the created offer, or null if cascade exhausted. */
export async function sendNextOffer(db: SupabaseClient, bookingId: string) {
  const candidates = await findCandidates(db, bookingId);
  if (!candidates.length) {
    await db
      .from('bookings')
      .update({ status: 'unmatched' })
      .eq('id', bookingId);
    await clearActiveOffer(bookingId);
    return null;
  }
  const next = candidates[0];

  // Determine the next rank (1-based).
  const { count } = await db
    .from('booking_offers')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId);

  const respondsBy = new Date(Date.now() + OFFER_TTL_SECONDS * 1000).toISOString();

  const { data: offer, error } = await db
    .from('booking_offers')
    .insert({
      booking_id: bookingId,
      provider_id: next.provider_id,
      rank: (count ?? 0) + 1,
      responds_by: respondsBy,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  await setActiveOffer(
    bookingId,
    { offer_id: offer.id, provider_id: next.provider_id, rank: offer.rank },
    OFFER_TTL_SECONDS,
  );

  await db.from('notifications').insert({
    profile_id: next.provider_id,
    type: 'offer.new',
    payload: { booking_id: bookingId, offer_id: offer.id, responds_by: respondsBy },
  });

  return offer;
}

/** Provider response. Returns updated booking + any cascade outcome. */
export async function respondToOffer(
  db: SupabaseClient,
  params: {
    offerId: string;
    providerId: string;
    accept: boolean;
    declineReason?: string;
  },
) {
  const { offerId, providerId, accept, declineReason } = params;
  const { data: offer, error } = await db
    .from('booking_offers')
    .select('*')
    .eq('id', offerId)
    .single();
  if (error || !offer) throw error ?? new Error('offer_not_found');
  if (offer.provider_id !== providerId) throw new Error('forbidden');
  if (offer.status !== 'pending') throw new Error('offer_no_longer_pending');
  if (new Date(offer.responds_by) < new Date()) {
    await db
      .from('booking_offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', offerId);
    const next = await sendNextOffer(db, offer.booking_id);
    return { result: 'expired' as const, next };
  }

  if (accept) {
    await db
      .from('booking_offers')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', offerId);
    await db
      .from('bookings')
      .update({ provider_id: providerId }) // trigger sets matched_at + status
      .eq('id', offer.booking_id);
    await clearActiveOffer(offer.booking_id);
    // Tell the customer.
    const { data: booking } = await db
      .from('bookings')
      .select('customer_id')
      .eq('id', offer.booking_id)
      .single();
    if (booking) {
      await db.from('notifications').insert({
        profile_id: booking.customer_id,
        type: 'booking.matched',
        payload: { booking_id: offer.booking_id, provider_id: providerId },
      });
    }
    return { result: 'accepted' as const };
  }

  await db
    .from('booking_offers')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString(),
      decline_reason: declineReason ?? null,
    })
    .eq('id', offerId);
  const next = await sendNextOffer(db, offer.booking_id);
  return { result: 'declined' as const, next };
}

/** Called by a scheduled job when an offer's TTL fires. */
export async function expireOfferIfStale(
  db: SupabaseClient,
  offerId: string,
) {
  const { data: offer } = await db
    .from('booking_offers')
    .select('*')
    .eq('id', offerId)
    .single();
  if (!offer || offer.status !== 'pending') return { changed: false };
  if (new Date(offer.responds_by) > new Date()) return { changed: false };
  await db
    .from('booking_offers')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('id', offerId);
  await sendNextOffer(db, offer.booking_id);
  return { changed: true };
}

// --- helpers -----------------------------------------------------------
function haversineKm(a: number, b: number, c: number, d: number): number {
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
