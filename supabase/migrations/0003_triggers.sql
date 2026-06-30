-- Triggers + utility functions

-- Auto-create profile row when a new auth.user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- Recompute a provider's rolling rating after any new review.
create or replace function recompute_rating()
returns trigger language plpgsql as $$
begin
  update profiles p
     set rating_avg = sub.avg, rating_count = sub.cnt
    from (
      select target_id, avg(rating)::numeric(3,2) as avg, count(*) as cnt
        from reviews where target_id = new.target_id group by target_id
    ) sub
   where p.id = sub.target_id;
  return new;
end;
$$;
create trigger reviews_recompute_rating
after insert on reviews
for each row execute function recompute_rating();

-- Recompute provider acceptance rate after each offer response.
create or replace function recompute_acceptance()
returns trigger language plpgsql as $$
declare a numeric;
begin
  if new.status in ('accepted','declined','expired') then
    select coalesce(
             sum(case when status='accepted' then 1 else 0 end)::numeric
             / nullif(count(*),0), 1.0)
      into a
      from booking_offers
     where provider_id = new.provider_id
       and offered_at > now() - interval '30 days';
    update profiles set acceptance_rate = coalesce(a,1.0) where id = new.provider_id;
  end if;
  return new;
end;
$$;
create trigger offers_recompute_acceptance
after update on booking_offers
for each row execute function recompute_acceptance();

-- Touch bookings.matched_at when provider_id first set.
create or replace function bookings_touch_matched()
returns trigger language plpgsql as $$
begin
  if old.provider_id is null and new.provider_id is not null then
    new.matched_at := now();
    new.status := 'assigned';
  end if;
  return new;
end;
$$;
create trigger bookings_touch_matched_trg
before update on bookings
for each row execute function bookings_touch_matched();
