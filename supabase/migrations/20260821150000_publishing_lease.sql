alter table public.campaign_posts
  add column if not exists publishing_started_at timestamptz;

create index if not exists idx_campaign_posts_publishing_lease
  on public.campaign_posts(publishing_started_at)
  where status = 'publishing';
