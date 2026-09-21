create table if not exists public.content_project_generation_runs (
 id uuid primary key, project_id uuid not null references public.content_projects(id) on delete cascade, workspace_id uuid not null,
 actor_id uuid not null, status text not null check(status in ('pending','ready','failed')), model text not null,
 input jsonb not null, output jsonb, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.content_project_generation_runs enable row level security;
revoke all on public.content_project_generation_runs from public,anon,authenticated;
grant all on public.content_project_generation_runs to service_role;
