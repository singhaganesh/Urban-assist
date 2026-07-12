# Provider App — Feature Audit & Gap Analysis

**Date:** 2026-07-12
**Scope:** `apps/provider/` post-login experience, plus the admin-side pieces the provider flow depends on.
**Target architecture (per product decision):** customer books → booking lands with **admin** → **admin assigns a provider** → provider is **notified** of the assignment. This is *not* the marketplace auto-match model the codebase currently implements.

---

## 1. The core architecture conflict (biggest finding)

The codebase today implements an **automatic offer-cascade marketplace**, not admin-driven assignment:

| Piece | Current behaviour | File |
|---|---|---|
| `match-cascade` edge function | Ranks nearby providers, creates `booking_offers` rows with 90s TTL, cascades to next on decline/expiry | `supabase/functions/match-cascade/` |
| `booking_offers` table | `pending → accepted / declined / expired`, `rank`, `responds_by` | `0001_schema.sql` |
| Provider dashboard | Realtime-subscribes to `notifications` for `offer.new`, shows `OfferCard` with countdown + Accept/Decline | `(app)/dashboard.tsx`, `(app)/offer-card.tsx` |
| Offer APIs | `PATCH /api/offers/[id]` (accept/decline), `POST /api/offers/[id]/expire` | `app/api/offers/` |
| Admin app | **No assignment capability at all.** Bookings page is read-only list. Dashboard only counts `pending_match` bookings ("Awaiting provider assignment") | `apps/admin/app/(app)/bookings/page.tsx` |

Notably, **nothing actually invokes `match-cascade`** from any app — the auto-match loop was never wired up end-to-end. So today a booking stays `pending_match` forever unless something external fires the function.

### What the admin-assign model needs (none of it exists)

1. **Admin: assignment UI** — on the bookings page, for each `pending_match` booking: list candidate providers (filter by category coverage, travel radius vs booking postcode, availability slots, time-off, KYC approved, is_online/active), pick one, assign.
2. **Admin: assign API** — `POST /api/bookings/[id]/assign` (admin app): sets `bookings.provider_id`, `status = 'assigned'`, `matched_at`, inserts a `notifications` row (`type: 'booking.assigned'`) for the provider, optionally FCM push via `notification-dispatch`.
3. **Provider: assignment notification** — dashboard realtime listener currently only reacts to `offer.new`. Needs to handle `booking.assigned` (banner/card + refresh of today's jobs).
4. **Provider: acknowledge/decline assigned job** — real-world providers must be able to reject an assignment (sick, conflict). Needs a decline-with-reason flow that returns the booking to admin's queue (`pending_match` again) and notifies admin.
5. **Decommission or park the cascade** — `OfferCard`, `/api/offers/*`, `match-cascade` either removed or kept dormant behind the admin flow. UI copy must change: dashboard/schedule empty states currently say *"Go online to start receiving offers"* / *"our matching engine ranks candidates"* — wrong under admin assignment.
6. **`is_online` toggle repurpose** — under admin dispatch it's no longer "receive offers" but "available for assignment today"; admin's provider picker should read it as an availability signal (or the toggle should be dropped).

---

## 2. What exists and works today (inventory)

| Area | Status | Notes |
|---|---|---|
| Phone OTP login (UK, E.164) | ✅ built | `login/`, `/api/auth/start`, rate-limited |
| 3-step registration wall | ✅ built | personal / business+coverage / bank payout; guard in `(app)/layout.tsx` |
| KYC document upload | ✅ built (bucket fixed today) | `onboarding/` + `kyc` bucket + `/api/kyc/verify` auto-approval check |
| Services & pricing setup | ✅ built | `onboarding/services/`, category picker, price/duration, active toggle |
| Dashboard (Today) | ✅ built | stats, today's jobs, online toggle, live offer card (cascade model) |
| Job detail lifecycle | ✅ built | assigned → on_the_way → arrived → OTP verify → in_progress (timer) → completion report → completed |
| Job chat with customer | ⚠️ UI built, API missing | see §3 |
| Schedule | ✅ built | agenda, weekly availability slots, time-off blocks |
| Earnings | ✅ built | card/cash split, pending payout, Stripe Connect onboard/dashboard/instant payout, print statement |
| Account | ⚠️ partially built | profile edit, reviews received, support tickets UI (API missing), dead GDPR buttons |

---

## 3. Broken things found during the dig (bugs, not gaps)

1. **Four API routes are called by the UI but do not exist** (all return 404):
   - `POST /api/cash-confirm` — job detail "Confirm Cash Collected" (`jobs/[id]/page.tsx:143`)
   - `POST /api/messages` — job chat send (`jobs/[id]/page.tsx:223`)
   - `POST /api/reviews` — rate-the-customer submit (`jobs/[id]/page.tsx:204`)
   - `POST /api/support` — raise support ticket (`account/page.tsx:130`)
   These features are fully built in the UI and silently broken.

2. **Completion-photo bucket mismatch.** Job completion uploads to bucket **`completion`** (`jobs/[id]/page.tsx:169`) and renders via `getPublicUrl` on `completion` (line 421). But the RLS policies in `0008_storage_policies.sql` were written for a bucket named **`completion-photos`** (which now exists, private). The stray `completion` bucket is **public** — completion evidence (photos of customers' homes) is publicly readable. Code should move to `completion-photos` + signed URLs, and the `completion` bucket should be deleted after migration. Also note the policy expects path `{booking_id}/…` while code writes `{user_id}/completions/…` — path convention must be aligned when switching.

3. **Job-start OTP verified client-side.** `getBookingOtp(booking.id)` runs in the provider's browser and is string-compared locally (`jobs/[id]/page.tsx:338`). The code is derivable from the bundle — a provider can start any job without the customer's code. Verification belongs in `/api/jobs/[id]/status` server-side.

4. **Dead GDPR buttons.** "Export My Data" and "Delete Account" (`account/page.tsx:302-307`) have no handlers.

5. **Account page assumes email identity.** Shows `user.email` in a disabled input — under phone-OTP auth email lives on `profiles.email`, and `user.email` is empty.

6. **Earnings ignores commission.** `total_pence` (what the customer pays) is treated as provider earnings. No platform-fee/commission model exists anywhere in schema or code — no real platform pays providers 100%. Needs `commission_pence` / provider-net on bookings and everywhere downstream (earnings page, payouts, statements).

7. **(Known, pre-existing)** `notification-dispatch` edge function uses legacy FCM HTTP API (deprecated) and has the `!redis.sismember()` promise bug — matters here because assignment notifications will run through it.

---

## 4. Missing features for a real-world provider app (gap list)

Ordered by priority. "★" = required for the admin-assign MVP loop to function at all.

### P0 — the assignment loop ★
- **Admin assign UI + API + provider notification + provider accept/decline-with-reason** (full breakdown in §1). Without this, bookings never reach providers.
- **Notification centre in provider app.** There is no bell icon, no notification list, no unread count, no mark-as-read — the `notifications` table exists and is realtime-enabled, but the only consumer is the dashboard's `offer.new` listener. Assignment, cancellation, payout, and KYC-status events all need a visible inbox.
- **Push notifications registration.** `fcm_tokens` table + `notification-dispatch` exist, but the provider app never requests permission or registers a token. An assignment sent while the app is closed reaches nobody.

### P1 — operating the business day-to-day
- **Job history.** Only *today's* jobs (dashboard) and *upcoming* jobs (schedule agenda) are visible. No list of past/completed/cancelled jobs, no search/filter by date or status. (Data exists; earnings shows completed sums but not a browsable job list.)
- **Booking cancellation/reschedule handling.** No provider-side flow for "customer cancelled" (notification + schedule update) or reschedule requests. `cancelled` status exists in schema; UI has no path to it except a status API that the UI never offers.
- **Documents management.** Onboarding shows upload only. No list of previously uploaded docs, no view/download, no re-upload when admin **rejects** KYC (`kyc_status = 'rejected'` has no recovery path in the UI), no expiry tracking (insurance renews yearly — real platforms chase expiring documents).
- **Profile completeness post-registration.** Registration captures `bio`, `business_name`, `travel_radius_miles`, postcode, bank details — **none are editable afterwards**. Account page edits only name/phone. Needs: edit bio/business/coverage (postcode + radius, updating `provider_location`), edit bank details, view NINO/UTR (masked), add UTR later (form promises "you can add this later" — there's nowhere to do it).
- **Avatar upload.** `avatars` bucket + policies exist, `avatar_url` is on profiles and shown to customers — no upload UI anywhere.

### P2 — money
- **Commission/fee transparency** (once §3.6 model exists): per-job breakdown "customer pays £X, platform fee £Y, you earn £Z" on job detail and earnings.
- **Earnings filters & periods.** Week/month/tax-year selectors, per-period totals; current page is an all-time flat list.
- **Statements/invoices.** Print CSS exists; real need is downloadable monthly statement (PDF/CSV) for HMRC self-assessment.
- **Payout schedule visibility.** "Payout Schedule: Weekly" is hard-coded copy; no actual schedule data, no next-payout date, no payout detail view.

### P3 — trust & growth
- **Ratings breakdown.** Average + count shown; no distribution, no response-to-review capability.
- **Referrals.** `referrals` table exists in schema; zero UI.
- **Help centre / FAQs** beyond raising a ticket; ticket detail view (current list shows description + status only, no thread/replies).
- **Earnings/job analytics.** Jobs per week, acceptance rate history, busiest areas — `analytics_events` table exists, unused by provider app.

### P4 — platform hygiene
- **In-app onboarding checklist** on dashboard (registration ✓ → KYC ✓ → services ✓ → Stripe ✓ → first job) — pieces exist as separate banner cards; a unified progress tracker converts better.
- **Session/device management, account deletion flow (GDPR)** — see dead buttons above.
- **Copy pass** — all "matching engine / go online for offers" copy must be rewritten for the dispatch model.

---

## 5. Suggested build order (admin-assign MVP)

1. **Commission decision + migration** (blocks earnings correctness; cheap to add now: `commission_pence` on bookings).
2. **Admin assign flow** — candidate query + assign API + UI (assign/unassign/reassign).
3. **Provider assignment surface** — `booking.assigned` realtime handler, notification centre (list + unread badge), accept/decline-with-reason API + UI, admin notified on decline.
4. **Fix the four 404 API routes** (`messages`, `reviews`, `cash-confirm`, `support`) — small, unblocks already-built UI.
5. **Move completion photos to `completion-photos` (private, signed URLs); server-side OTP check.**
6. **Job history page + documents management + profile editing (bio/coverage/bank/avatar).**
7. **FCM v1 migration + token registration** so assignments push to closed apps.
8. Retire/park `match-cascade`, `booking_offers`, `OfferCard`, offer APIs; copy pass.

---

*Everything in §3 is verifiable directly in the files referenced. §4 priorities assume UK sole-trader providers and the admin-dispatch model; reorder if the marketplace cascade is ever revived (the code for it is ~80% present but unwired).*
