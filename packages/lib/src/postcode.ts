// UK postcode lookup. Uses postcodes.io (free, no key) for resolution
// and optionally getAddress.io / OS Places if POSTCODE_LOOKUP_API_KEY is set.
// Returns lat/lng + a list of candidate addresses.

import { UK_POSTCODE_RE } from './format';

export interface PostcodeResult {
  postcode: string;
  lat: number;
  lng: number;
  admin_ward: string | null;
  region: string | null;
  addresses?: string[]; // optional, requires premium provider
}

export async function lookupPostcode(raw: string): Promise<PostcodeResult | null> {
  const pc = raw.replace(/\s+/g, '').toUpperCase();
  if (!UK_POSTCODE_RE.test(pc)) return null;

  // 1. Free postcode → geo lookup.
  const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
  if (!r.ok) return null;
  const j = await r.json();
  const d = j.result;
  if (!d) return null;

  const base: PostcodeResult = {
    postcode: d.postcode,
    lat: d.latitude,
    lng: d.longitude,
    admin_ward: d.admin_ward ?? null,
    region: d.region ?? null,
  };

  // 2. Optional: full address list via getAddress.io
  const key = process.env.POSTCODE_LOOKUP_API_KEY;
  if (key) {
    try {
      const ar = await fetch(
        `https://api.getAddress.io/find/${encodeURIComponent(pc)}?api-key=${key}&expand=true`,
      );
      if (ar.ok) {
        const aj = await ar.json();
        base.addresses = (aj.addresses ?? []).map((a: any) =>
          [a.line_1, a.line_2, a.line_3, a.town_or_city].filter(Boolean).join(', '),
        );
      }
    } catch {
      /* premium lookup is optional */
    }
  }
  return base;
}
