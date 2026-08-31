-- ============================================================
--  MOM'S RECIPE JOURNAL — database setup
--
--  Paste this whole file into the Supabase SQL Editor and press
--  Run. It is safe to run twice.
--
--  Full walkthrough: docs/database-setup.md
-- ============================================================


-- ------------------------------------------------------------
-- 1. The recipes table — one row per page of her journal
-- ------------------------------------------------------------

create table if not exists public.recipes (
  id           text primary key,                    -- "aloo-paratha"
  title        text not null,
  subtitle     text,
  category     text not null
               check (category in ('breakfast','lunch','dinner','treats')),
  rating       smallint default 0 check (rating between 0 and 5),
  difficulty   smallint default 1 check (difficulty between 1 and 5),
  portions     smallint default 4 check (portions > 0),

  -- { "vegetarian": true, "vegan": false, "glutenFree": false, "dairyFree": false }
  diet         jsonb not null default '{}'::jsonb,

  -- { "hrs": 0, "mins": 30 }
  prep         jsonb not null default '{"hrs":0,"mins":0}'::jsonb,
  cook         jsonb not null default '{"hrs":0,"mins":0}'::jsonb,

  ingredients  jsonb not null default '[]'::jsonb,  -- ["2 cups flour", …]
  method       jsonb not null default '[]'::jsonb,  -- ["Knead the dough.", …]

  hints        text,          -- the "Hints, Tips & Tricks" box
  goes_with    text,          -- the "Goes Great With" box
  notes        text,          -- anything she said worth keeping

  cover        text,          -- optional thumbnail; otherwise the first photo

  -- { "images": [{src, caption}], "videos": [{src, caption}], "audio": [{src, caption}] }
  -- `src` is a bucket path ("aloo-paratha/tawa.jpg") or any full URL.
  media        jsonb not null default '{"images":[],"videos":[],"audio":[]}'::jsonb,

  added_on     date        not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists recipes_category_idx on public.recipes (category);
create index if not exists recipes_added_on_idx on public.recipes (added_on desc);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists recipes_touch_updated_at on public.recipes;
create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();


-- ------------------------------------------------------------
-- 2. Who can do what
--
--    Anyone with the link can READ the journal.
--    Only someone signed in can ADD, EDIT or DELETE.
--
--    This is what makes it safe to put the anon key in config.js.
-- ------------------------------------------------------------

alter table public.recipes enable row level security;

drop policy if exists "recipes are readable by everyone"      on public.recipes;
drop policy if exists "signed in family can add recipes"      on public.recipes;
drop policy if exists "signed in family can edit recipes"     on public.recipes;
drop policy if exists "signed in family can delete recipes"   on public.recipes;

create policy "recipes are readable by everyone"
  on public.recipes for select
  to anon, authenticated
  using (true);

create policy "signed in family can add recipes"
  on public.recipes for insert
  to authenticated
  with check (true);

create policy "signed in family can edit recipes"
  on public.recipes for update
  to authenticated
  using (true) with check (true);

create policy "signed in family can delete recipes"
  on public.recipes for delete
  to authenticated
  using (true);


-- ------------------------------------------------------------
-- 3. The media bucket — photos, videos and voice notes
--
--    Public read so the website can show them, signed-in write
--    so only family can upload.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recipe-media', 'recipe-media', true)
on conflict (id) do update set public = true;

drop policy if exists "media is viewable by everyone"    on storage.objects;
drop policy if exists "signed in family can upload"      on storage.objects;
drop policy if exists "signed in family can replace"     on storage.objects;
drop policy if exists "signed in family can remove"      on storage.objects;

create policy "media is viewable by everyone"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'recipe-media');

create policy "signed in family can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-media');

create policy "signed in family can replace"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-media') with check (bucket_id = 'recipe-media');

create policy "signed in family can remove"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-media');


-- ------------------------------------------------------------
-- 4. Done.
--
--    Next: Authentication → Users → "Add user" to create the one
--    login you'll use in admin.html. Then turn OFF public sign-ups
--    under Authentication → Sign In / Providers → "Allow new users
--    to sign up", so nobody else can make an account and write to
--    the journal.
-- ------------------------------------------------------------
