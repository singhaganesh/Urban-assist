-- Row Level Security policies
-- Customers see only their own data, providers see jobs offered/assigned to them,
-- admins (profiles.role = 'admin') can read KYC + support tickets only.

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table service_categories enable row level security;
alter table provider_services enable row level security;
alter table availability_slots enable row level security;
alter table time_off enable row level security;
alter table provider_documents enable row level security;
alter table provider_location enable row level security;
alter table promo_codes enable row level security;
alter table bookings enable row level security;
alter table booking_offers enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table reviews enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table fcm_tokens enable row level security;
alter table favorites enable row level security;
alter table support_tickets enable row level security;
alter table referrals enable row level security;
alter table analytics_events enable row level security;

-- Helper: current user's role
create or replace function public.user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

-- PROFILES ---------------------------------------------------
create policy "read own profile" on profiles
  for select using (id = auth.uid() or public.user_role() = 'admin');
create policy "read provider public fields" on profiles
  for select using (role = 'provider');
create policy "update own profile" on profiles
  for update using (id = auth.uid());
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

-- ADDRESSES --------------------------------------------------
create policy "owner addresses" on addresses
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- SERVICE CATEGORIES (public read) --------------------------
create policy "categories public read" on service_categories for select using (true);

-- PROVIDER SERVICES (public read; provider write own) ------
create policy "provider services public read" on provider_services
  for select using (is_active = true);
create policy "provider services owner manage" on provider_services
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- AVAILABILITY / TIME OFF -----------------------------------
create policy "availability owner" on availability_slots
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "time_off owner" on time_off
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- KYC DOCS (provider owns; admin reads) ---------------------
create policy "kyc docs owner" on provider_documents
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "kyc docs admin read" on provider_documents
  for select using (public.user_role() = 'admin');

-- PROVIDER LOCATION (provider writes; matched customer reads)
create policy "provider location self" on provider_location
  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy "provider location matched customer" on provider_location
  for select using (
    exists (
      select 1 from bookings b
      where b.provider_id = provider_location.provider_id
        and b.customer_id = auth.uid()
        and b.status in ('assigned','on_the_way','arrived','in_progress')
    )
  );

-- BOOKINGS --------------------------------------------------
create policy "booking customer read" on bookings
  for select using (customer_id = auth.uid());
create policy "booking provider read" on bookings
  for select using (provider_id = auth.uid());
create policy "booking customer insert" on bookings
  for insert with check (customer_id = auth.uid());
create policy "booking customer update" on bookings
  for update using (customer_id = auth.uid());
create policy "booking provider update" on bookings
  for update using (provider_id = auth.uid());
create policy "booking admin read" on bookings
  for select using (public.user_role() = 'admin');

-- OFFERS (provider sees own; customer sees own bookings) ---
create policy "offers provider read" on booking_offers
  for select using (provider_id = auth.uid());
create policy "offers customer read" on booking_offers
  for select using (
    exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );
create policy "offers provider respond" on booking_offers
  for update using (provider_id = auth.uid());

-- PAYMENTS --------------------------------------------------
create policy "payments customer read" on payments
  for select using (
    exists (select 1 from bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );
create policy "payments provider read" on payments
  for select using (
    exists (select 1 from bookings b where b.id = booking_id and b.provider_id = auth.uid())
  );

-- PAYOUTS ---------------------------------------------------
create policy "payouts provider read" on payouts
  for select using (provider_id = auth.uid());

-- REVIEWS ---------------------------------------------------
create policy "reviews public read" on reviews for select using (true);
create policy "reviews author insert" on reviews
  for insert with check (author_id = auth.uid());

-- MESSAGES (booking participants only) ----------------------
create policy "messages participants" on messages
  for all using (
    exists (
      select 1 from bookings b
      where b.id = booking_id and (b.customer_id = auth.uid() or b.provider_id = auth.uid())
    )
  ) with check (sender_id = auth.uid());

-- NOTIFICATIONS ---------------------------------------------
create policy "notifications owner" on notifications
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- FCM TOKENS ------------------------------------------------
create policy "fcm tokens owner" on fcm_tokens
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- FAVORITES -------------------------------------------------
create policy "favorites owner" on favorites
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- SUPPORT TICKETS -------------------------------------------
create policy "tickets owner" on support_tickets
  for all using (raised_by = auth.uid()) with check (raised_by = auth.uid());
create policy "tickets admin read" on support_tickets
  for select using (public.user_role() = 'admin');
create policy "tickets admin update" on support_tickets
  for update using (public.user_role() = 'admin');

-- REFERRALS -------------------------------------------------
create policy "referrals owner read" on referrals for select using (owner_id = auth.uid());

-- ANALYTICS (insert-only from clients; admin reads) --------
create policy "analytics insert any auth" on analytics_events
  for insert with check (auth.uid() is not null);
create policy "analytics admin read" on analytics_events
  for select using (public.user_role() = 'admin');

-- PROMO CODES (public read for validation) ------------------
create policy "promo public read" on promo_codes for select using (true);
