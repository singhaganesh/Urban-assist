# Urban Assist — Full Architecture Implementation Plan (Admin-Dispatch Model)

**Date:** 2026-07-12
**Covers:** customer, provider, admin apps + database + edge functions.
**Target flow:** customer picks a service from the catalogue and books → booking lands in the **admin dispatch queue** → admin assigns a provider (matched on booking service vs provider skills) → provider receives a notification with **full booking details** (address, time, price, notes) → provider accepts → travels → OTP-verified start → completes job → payment settles.

All 9 loopholes from `provider_features_audit.md` §analysis are folded in — the mapping table is at the end.

---

## Design & theme rule (applies to every phase)

All new UI in **all three apps** uses the customer app's existing design system. The shared Tailwind preset already exists (`packages/ui/tailwind-preset.js`) and all apps consume `@urban-assist/ui`:

- **Warm Stone** page background (`bg-bg`), white cards with `border-hairline` + `shadow-card`, `rounded-xl` (14px)
- **Terracotta** primary CTAs (`bg-accent` / `hover:bg-accent-hover`, white bold text)
- **Slate Navy** headings (`text-ink`, `font-display`), body `text-charcoal`, secondary `text-muted`
- Sage green `bg-success` for positive states, `text-danger` for destructive
- 44px touch targets (`tap` class), `font-mono-utility` for codes/labels
- Reuse `Card`, `Button`, `Badge`, `Field`, `Input`, `EmptyState`, `AppShell` from `@urban-assist/ui` — no new one-off styles

The **admin app** is the one that currently deviates most; Phase 3 includes bringing its screens onto this system.

---

## Key architectural decisions (made now, changeable before Phase 1 starts)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | What does a customer book? | A **catalogue service** (leaf of the taxonomy), not a provider's listing. `provider_service_id` becomes nullable on bookings; a new `service_id` is required. Price = fixed platform price per service (start with taxonomy `minPricePence` as the base price; admin-editable later). | Under admin dispatch the customer must not pick the provider. Current `createBooking` requires a provider's listing — incompatible. |
| D2 | Taxonomy source of truth | Move the 3-level taxonomy (14 categories / ~50 subcategories / ~150 services) from `apps/customer/lib/services-data.ts` into the **database** (`service_categories` extended + new `service_subcategories`, `services` tables), seeded by migration. The TS file stays for icons/imagery only, keyed by slug. | Admin skill-matching and provider skill selection must query the same tree the customer books from. Today DB has 8 flat categories — unusable for matching. |
| D3 | Provider skills | `provider_services` gets `service_id` (leaf-level). During service setup the provider picks the **subcategories** they cover; the editor expands them to leaf services with platform pricing shown. Match rule: provider has an active `provider_services` row for the booked `service_id` (fallback: any service in the same subcategory). | "Assign based on booking service and provider skill" needs leaf-level skill data. |
| D4 | Payment sequencing | **Card: capture at booking** (current behaviour, keep) + **automatic full refund** if the booking is cancelled or cannot be assigned/accepted by SLA. Cash: unchanged (collect on site). | Stripe auth-holds expire after 7 days — bookings are often scheduled further out, so authorize-now-capture-later breaks. Capture+refund is the simplest correct initial model. Revisit (capture-on-completion via saved payment method) post-launch. |
| D5 | Assignment mechanics | **Reuse `booking_offers`** as the assignment vehicle: admin assign = insert one `booking_offers` row (`created_by = admin`, long `responds_by`, e.g. 2 h). Provider accept → booking `assigned`. Decline/timeout → offer closed, booking back to `pending_match`, admin alerted. | Accept/decline APIs, RLS, and realtime plumbing already exist for offers — repurpose instead of rebuild. Kills the cascade without schema surgery. |
| D6 | Contact/address disclosure | Initial phase: provider sees **full details at assignment** (address, customer name, phone). Accepted risk; note for later: mask phone via proxy + reveal house number on job day. | Simplicity first; risk consciously accepted. |
| D7 | `is_online` semantics | Renamed in UI to **"Available for work"**. Admin candidate list reads it as a soft signal (shown, not filtered out). Time-off and schedule conflicts are hard filters. | Loophole 9. |
| D8 | Commission | Add `commission_pence` + `provider_net_pence` to bookings now (default commission 15%, configurable constant in `packages/domain/src/pricing`). Provider UI shows net; customer sees total. | Loophole/audit §3.6 — retrofitting later touches every money surface. |
| D9 | SLA | New booking → admin notified immediately (realtime + push/email). Customer copy: "We'll confirm your professional within 2 hours (8am–8pm)." Unassigned after SLA → escalation flag in admin queue; auto-refund only on customer cancel or admin cancel. | Loophole 2. |

---

## Booking state machine (single source of truth)

`booking_status` enum stays; meanings shift slightly. `pending_match` = **awaiting admin dispatch**.

```
pending_match ──admin assigns──▶ [offer pending: provider deciding]
   ▲    │                              │accept            │decline / timeout
   │    │customer cancels              ▼                  ▼
   │    ▼                          assigned ──────▶ back to pending_match (admin alerted)
   │  cancelled ◀──customer/admin──── │
   │                                  ▼ provider taps "En route"
   │                              on_the_way ─▶ arrived ─▶ in_progress ─▶ completed
   │                                  │ provider cancels (with reason)          │
   └──────────────────────────────────┘                                    disputed (via ticket)
unmatched = SLA breached, still undispatched (admin escalation view)
```

Transition rules enforced **server-side** in one place (`packages/domain/src/bookings`):
- customer cancel allowed in: `pending_match`, `unmatched`, `assigned` (existing `CANCELLABLE_STATUSES`) → card auto-refund (exists)
- provider cancel-after-accept allowed in: `assigned`, `on_the_way` → booking returns to `pending_match`, reason recorded, admin + customer notified
- reschedule (customer) allowed in: `pending_match`, `unmatched` (exists); rescheduling an `assigned` booking = cancel + rebook (existing rule, keep for initial phase)
- `in_progress` only reachable via **server-verified OTP** (see Phase 4.4)
- double-booking guard: assign API rejects if provider has any booking in (`assigned`,`on_the_way`,`arrived`,`in_progress`) overlapping ±duration window (loophole 3)

---

# Phases

## Phase 0 — Groundwork & decisions (no code)

1. Sign off decisions D1–D9 above.
2. Confirm commission rate (default 15%) and SLA window (default 2 h, 8am–8pm).
3. Supabase dashboard: confirm buckets exist (`kyc`, `completion-photos`, `avatars` — done 2026-07-12); delete stray public `completion` bucket **after** Phase 4.5 migrates code off it.
4. Decide admin operator accounts (which profiles get `role='admin'`).

**Exit:** decisions table frozen.

---

## Phase 1 — Database & domain layer

### 1.1 Migration `0010_taxonomy.sql`
- `service_subcategories` (id uuid, category_id fk, slug unique, name, description, icon, sort_order)
- `services` (id uuid, subcategory_id fk, slug unique, name, description, min_price_pence, max_price_pence, **base_price_pence**, duration_mins, is_popular, is_active, sort_order)
- Extend `service_categories` with the 6 missing categories (14 total; keep existing 8 rows, update names/slugs where they diverge — map `gardening`→`gardening-outdoor`, `appliance-repair`→`appliance-services`, `painting`→`painting-decorating`; add `carpentry`, `pest-control`, `heating-gas`, `air-conditioning`, `roofing`, `moving-services`)
- Seed **all** subcategories + services from `apps/customer/lib/services-data.ts` (write a one-off script `scripts/gen-taxonomy-seed.ts` that emits the SQL from the TS file — do not hand-type 150 rows). `base_price_pence = minPricePence`.
- RLS: public read on all three tables.

### 1.2 Migration `0011_dispatch.sql`
- `bookings`: add `service_id uuid references services`, `commission_pence integer not null default 0`, `provider_net_pence integer not null default 0`, `assigned_by uuid references profiles`, `sla_due_at timestamptz`; make `provider_service_id` nullable.
- `provider_services`: add `service_id uuid references services` (nullable during transition).
- `booking_offers`: add `created_by uuid references profiles` (null = legacy cascade), `kind text not null default 'dispatch'`.
- New notification types are data, no schema change (`booking.created`(→admins), `booking.assigned`, `booking.unassigned`, `booking.accepted`, `booking.declined`, `booking.cancelled_by_customer`, `booking.cancelled_by_provider`, `booking.reminder`).
- RLS: admins read/write all bookings + offers (`user_role() = 'admin'` helper exists).

### 1.3 Domain changes (`packages/domain`)
- `pricing`: add `COMMISSION_RATE`, `quote()` returns `commission_pence`, `provider_net_pence`.
- `bookings/createBooking`: input takes `serviceId` (+ optional legacy providerServiceId); price from `services.base_price_pence`; **remove `sendNextOffer` call**; set `sla_due_at`; insert `booking.created` notification for every admin profile.
- New `dispatch` module:
  - `listCandidates(bookingId)` — providers where: active skill row matches `service_id` (fallback same subcategory), `kyc_status='approved'`, `registration_completed`, no time-off covering slot, availability slot covers weekday+time, no overlapping booking, distance(provider_location, booking postcode) ≤ `travel_radius_miles`. Returns ranked list (distance ASC, rating DESC, jobs-in-progress ASC). **Pure function returning ranked candidates → later auto-assign = "take top 1"** (loophole 8).
  - `assignProvider(bookingId, providerId, adminId, respondsInMins=120)` — double-booking guard; insert dispatch offer; notify provider (`booking.assigned` with full booking payload); notify customer ("professional proposed" optional — skip for initial phase).
  - `unassignProvider` / `reassign` — close open offer or strip `provider_id`, return booking to `pending_match`, notify affected provider.
  - `respondToDispatchOffer(offerId, providerId, accept, declineReason?)` — accept: set booking `provider_id`, `status='assigned'`, `matched_at`; notify customer + admin. Decline: reason **required**, booking → `pending_match`, notify admins.
  - `expireDispatchOffers()` — offers past `responds_by` → expired, booking → `pending_match`, notify admins (loophole 1 timeout).
- `updateJobStatus`: add OTP parameter; `in_progress` transition requires server-side OTP check (move `getBookingOtp` derivation into server code, or better: random 4-digit stored on bookings at assignment, shown to customer).
- Provider cancel-after-accept: `providerCancelBooking(bookingId, providerId, reason)` per state machine above.

### 1.4 Types
- Regenerate/extend `packages/db/src/types.ts` for all new columns/tables.

**Exit:** `supabase db push` clean; typecheck green; unit-test the state machine + candidate filter in `packages/domain` if test rig exists, else a scripted smoke test.

---

## Phase 2 — Customer app

### 2.1 Booking entry (`book/[serviceId]`)
- `serviceId` param becomes the **catalogue service id** (from `services` table). Page fetches service + subcategory + category from DB; no provider shown.
- `BookFlow`: unchanged steps (address, date/time, payment method, promo, notes) but quote from `base_price_pence` via updated `quote()`; POST body sends `service_id`.
- Confirmation screen + booking detail: expectation copy — "Booking received. We'll confirm your professional within 2 hours (8am–8pm). You'll get a notification as soon as they accept." (loophole 2 customer side)

### 2.2 Browse/services pages
- `services/`, `services/[category]/`, `services/[category]/[service]/`, `browse/`: read taxonomy from DB instead of the TS file (icons still from `services-data.ts` icon map by slug). "Book now" links carry the DB service id.

### 2.3 Booking lifecycle surface
- `bookings/[id]`: status timeline for new states — Awaiting confirmation → Professional assigned (name, photo, rating once `assigned`) → En route → Arrived (show OTP code big) → In progress → Completed.
- OTP display: from server-stored booking OTP (Phase 1.3), not client-derived.
- Realtime: subscribe to own booking notifications (`booking.accepted`, `booking.cancelled_by_provider`, reschedule outcomes).
- Cancel/reschedule: already implemented — verify statuses against new state machine, update copy.

### 2.4 Payments
- Keep capture-at-booking (current). Add visible refund state on cancelled bookings (payments row already flips to `refunded`).

**Exit:** end-to-end manual test — book a cleaning service as customer, booking appears `pending_match` with `sla_due_at`, money captured, admin notification row exists.

---

## Phase 3 — Admin app: dispatch console

### 3.1 Theme alignment
- Wrap admin in `AppShell` with customer tokens; replace ad-hoc styles on existing pages (dashboard, bookings, providers, kyc, tickets) with `@urban-assist/ui` components. One pass, no functional change.

### 3.2 Dispatch queue (rework `(app)/bookings/`)
- Default tab **"Needs assignment"**: `pending_match` ordered by `sla_due_at` ASC; red highlight past SLA (`unmatched` escalation view — loophole 2).
- Tabs: Needs assignment / Awaiting provider response (open dispatch offer) / Active (assigned…in_progress) / Completed / Cancelled.
- Realtime badge: subscribe to `booking.created` notifications → live count + browser notification (loophole 2 admin side).

### 3.3 Booking detail + assign flow (new page `(app)/bookings/[id]`)
- Full booking info: service (category ▸ subcategory ▸ service), schedule, address + map link, customer info, price/commission split, notes, payment state, history of offers/declines.
- **Candidate panel**: `GET /api/bookings/[id]/candidates` → `listCandidates` output. Each row: name, avatar, rating, distance, jobs today, "Available ✓ / on holiday ✗", skill match level (exact service / same subcategory). Disabled rows show *why* they're filtered (conflict, time-off, radius).
- Assign button → `POST /api/bookings/[id]/assign { provider_id }` → creates dispatch offer. UI flips to "Awaiting response (deadline countdown)". Reassign/withdraw available while pending.
- On decline/expiry: booking returns to queue tab automatically (realtime), decline reason shown in history (loopholes 1, 4).
- Admin cancel booking (with reason) → refund path fires; both parties notified.

### 3.4 Admin APIs (all under `apps/admin/app/api/`)
- `GET /api/bookings/[id]` (detail), `GET /api/bookings/[id]/candidates`, `POST /api/bookings/[id]/assign`, `POST /api/bookings/[id]/unassign`, `POST /api/bookings/[id]/cancel`. All: admin-role guard + zod.

**Exit:** manual test — the Phase 2 booking shows in queue, candidates listed correctly (seed one approved provider with matching skill), assign fires notification, decline returns it to queue with reason.

---

## Phase 4 — Provider app: assignment surface

### 4.1 Notification centre
- `notifications` bell in `AppShell` header (unread count via realtime), new page `(app)/notifications`: list, mark-read on open, mark-all-read. Types rendered: assignment, cancellation, payout, KYC.

### 4.2 Assignment card (replaces cascade OfferCard on dashboard)
- Realtime listener switches from `offer.new` to `booking.assigned`.
- Card shows **full booking details** (service, date/time, address, customer first name, pay = `provider_net_pence`, notes) + response deadline (hours, not 90 s) + **Accept / Decline (reason required — dropdown: schedule conflict, too far, unwell, other + text)**.
- Accept → job appears in Today/Schedule; Decline → card clears, admin notified. Reuses `PATCH /api/offers/[id]` pointed at `respondToDispatchOffer`.
- Pending assignments also listed on `/notifications` and dashboard (survives page reload — fetch open dispatch offers server-side, already done for `openOffer`).

### 4.3 Jobs history
- New `(app)/jobs` page: tabs Upcoming / Completed / Cancelled, paginated, linking to existing job detail.

### 4.4 Job execution fixes
- **Server-side OTP**: `PATCH /api/jobs/[id]/status` validates the 4-digit code against the booking's stored OTP for the `in_progress` transition; client just posts the code (fixes audit §3.3).
- **Completion photos**: upload to `completion-photos` (private) under path `{booking_id}/{filename}` (matches RLS); render via `createSignedUrl`. Then delete legacy `completion` bucket usage.
- Provider cancel-after-accept button on job detail (`assigned`/`on_the_way` only) with reason → `providerCancelBooking`.
- Earnings shown = `provider_net_pence` everywhere (dashboard stat, job detail "You earn", earnings page; commission line visible on job detail).

### 4.5 Missing API routes (unblock built UI)
- Port from customer app (logic already in domain/`messages`, `reviews`, `cash-confirm`, `support` routes exist there): create provider-side `POST /api/messages`, `POST /api/reviews`, `POST /api/cash-confirm`, `POST /api/support`.

### 4.6 Availability semantics
- Dashboard toggle relabel: "Available for work"; copy pass on all "offers/matching engine" strings (dashboard, schedule empty states, services editor).

**Exit:** full happy path on staging: book → admin assign → provider accepts → en-route → arrived → customer OTP → in progress → complete with photo → cash confirm / card already captured → both reviews.

---

## Phase 5 — Push & notification dispatch

1. Fix `notification-dispatch` edge function: migrate legacy FCM HTTP → **FCM v1 API**; fix `!(await redis.sismember(...))` await bug.
2. Provider app: FCM token registration (permission prompt on dashboard after first assignment-relevant action; `POST /api/fcm-token` — copy from customer app which already has it).
3. Wire dispatch events → push: `booking.assigned` (provider), `booking.accepted`/`booking.cancelled_by_provider` (customer), `booking.created`/`booking.declined`/offer-expired (admins).
4. Offer-expiry sweep: extend the existing scheduled edge function (or dashboard cron) to call `expireDispatchOffers()` every 5 min (loophole 1 timeout leg).

**Exit:** push received on a real device for assignment while app closed.

---

## Phase 6 — Money correctness

1. `quote()` commission split flows into bookings on create (done Phase 1) — backfill migration for existing rows (`commission_pence = 0` acceptable for legacy).
2. Earnings page: net/gross split, commission line in transaction list, pending payout uses net.
3. Refund paths verified: customer cancel (exists), admin cancel (Phase 3), provider cancel-after-accept → customer choice: refund or back to queue (initial phase: **auto back-to-queue + notify customer**, refund only if customer then cancels — simplest).
4. Payout statement footer/print already exists — update numbers to net.

**Exit:** reconcile one card booking end-to-end in Stripe test dashboard: capture, commission math, refund on cancel.

---

## Phase 7 — Retire the cascade + hardening

1. Delete/park: `matching-engine` cascade internals (`sendNextOffer`, `findCandidates` cascade ranking — keep whatever `listCandidates` reuses), `match-cascade` edge function, `OfferCard` countdown variant, `/api/offers/[id]/expire` (client-driven expiry), `retryMatching` + customer "retry" route (replaced by admin dispatch).
2. `bookings.retry` route in customer app → remove or repoint to "contact support".
3. Dead GDPR buttons on provider account: wire export (dump profile+bookings JSON) or hide for initial phase (decide).
4. Account page `user.email` → `profiles.email` (phone auth).
5. RLS audit: admins on new tables, providers can only see own offers/bookings, customers own bookings; verify with the three roles.
6. Copy pass (all apps) for dispatch language.
7. E2E script (`docs/` checklist or Playwright if rigged): the 12-step happy path + 6 unhappy paths (decline, timeout, customer cancel pre/post assign, provider cancel, double-book attempt).

**Exit:** no code path can create a cascade offer; audit checklist green.

---

## Loophole → phase mapping

| # | Loophole | Fixed in |
|---|---|---|
| 1 | Provider can't decline / no-show → stuck booking | D5, 1.3 (`respondToDispatchOffer`, `expireDispatchOffers`), 4.2, 5.4 |
| 2 | Admin offline, bookings pile up (SLA) | D9, 1.2 (`sla_due_at`), 2.1 copy, 3.2 queue + alerts, 5.3 push |
| 3 | Double-booking same provider | 1.3 assign guard, 3.3 candidate filter shows conflicts |
| 4 | Cancellation paths undefined | State machine table, 1.3, 2.3, 3.3, 4.4 |
| 5 | Full address/phone leak at assignment | D6 — consciously accepted for initial phase, masking noted post-launch |
| 6 | Completion/OTP verification client-side | 1.3 + 4.4 server-side OTP; completion photos private bucket |
| 7 | Payment sequencing undefined | D4 capture+refund, Phase 6 |
| 8 | Admin bottleneck at scale | 1.3 `listCandidates` pure/ranked → future auto-assign = top-1; API shape ready |
| 9 | `is_online` ambiguity | D7, 4.6 |

Audit bugs also covered: 404 routes (4.5), `completion` bucket (4.4 + Phase 0.3), commission (D8/Phase 6), GDPR buttons + email field (7.3/7.4), FCM legacy + dedup bug (5.1).

---

## Suggested commit cadence

One commit per numbered step, push after each phase completes and its exit test passes — same rhythm as the registration-wall work. Phases 1→2→3→4 are strictly ordered (each depends on the previous). Phases 5 and 6 can interleave after 4. Phase 7 last.
