create extension if not exists pgcrypto;

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  email text not null,
  role text not null default 'editor' check (role in ('admin', 'editor', 'viewer')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null default now() + interval '30 days',
  message text,
  created_at timestamptz default now()
);

alter table public.workspace_invitations enable row level security;

drop policy if exists "workspace members can view invitations" on public.workspace_invitations;
create policy "workspace members can view invitations" on public.workspace_invitations
  for select using (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
        and status = 'active'
    )
  );

drop policy if exists "workspace admins can insert invitations" on public.workspace_invitations;
create policy "workspace admins can insert invitations" on public.workspace_invitations
  for insert with check (
    workspace_id in (
      select workspace_id
      from public.workspace_members
      where user_id = auth.uid()
        and status = 'active'
        and role in ('owner', 'admin')
    )
  );

create index if not exists workspace_invitations_workspace_id_idx
  on public.workspace_invitations(workspace_id);

create index if not exists workspace_invitations_email_idx
  on public.workspace_invitations(lower(email));

create index if not exists workspace_invitations_status_idx
  on public.workspace_invitations(status);
