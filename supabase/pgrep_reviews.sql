create table if not exists public.pgrep_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  target_steam_id text not null,
  reviewer_steam_id text not null,
  review_type text not null check (review_type in ('positive', 'negative')),
  reasons text[] not null default '{}'::text[],
  match_id text null,
  match_data jsonb null
);

create index if not exists pgrep_reviews_target_idx
  on public.pgrep_reviews (target_steam_id, created_at desc);

create index if not exists pgrep_reviews_reviewer_idx
  on public.pgrep_reviews (reviewer_steam_id, created_at desc);

create unique index if not exists pgrep_reviews_unique_pair_idx
  on public.pgrep_reviews (target_steam_id, reviewer_steam_id);
