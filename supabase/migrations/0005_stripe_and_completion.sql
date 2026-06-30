-- Migration 0005: Add stripe_account_id and completion_report, and ensure storage buckets exist.

alter table profiles add column stripe_account_id text;
alter table bookings add column completion_report text;

-- Create completion storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('completion', 'completion', true)
on conflict (id) do nothing;

-- Add RLS policies for completion bucket
create policy "completion public read" on storage.objects
  for select using (bucket_id = 'completion');

create policy "completion provider insert" on storage.objects
  for insert with check (
    bucket_id = 'completion'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );
