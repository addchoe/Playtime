-- Time Archive shared storage.
--
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- for whichever Supabase project js/services/supabaseConfig.js points at.
-- Without this, feedbackService.js has nothing to read/write.
--
-- There is no real admin auth yet (see js/services/adminAuth.js's TODO) —
-- the "Setting" password gate is purely client-side. So these policies stay
-- wide open (anon can read/write everything); hidden-entry filtering and
-- the delete/hide/reorder buttons are enforced by the UI only, same trust
-- level the app already had when storage was localStorage. Tighten this
-- once real admin auth exists.

create table if not exists public.feedback_drawings (
  id text primary key,
  image_url text not null,
  submitted_at timestamptz not null default now(),
  hidden boolean not null default false,
  position double precision not null default 0
);

alter table public.feedback_drawings enable row level security;

create policy "anon full access to feedback_drawings"
  on public.feedback_drawings for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('feedback-drawings', 'feedback-drawings', true)
on conflict (id) do nothing;

create policy "anon full access to feedback-drawings files"
  on storage.objects for all
  to anon
  using (bucket_id = 'feedback-drawings')
  with check (bucket_id = 'feedback-drawings');
