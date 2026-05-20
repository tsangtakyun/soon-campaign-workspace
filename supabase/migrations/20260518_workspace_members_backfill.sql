-- Backfill workspace membership so the sidebar can list all workspaces
-- through workspace_members, while keeping existing owner_id based rows.

alter table public.workspace_members enable row level security;

insert into public.workspace_members (
  workspace_id,
  user_id,
  email,
  display_name,
  role,
  status,
  created_at
)
select
  w.id,
  w.owner_id,
  coalesce(w.owner, w.owner_id::text),
  coalesce(w.owner, w.name, w.owner_id::text),
  'owner',
  'active',
  coalesce(w.created_at, now())
from public.workspaces w
where w.owner_id is not null
on conflict (workspace_id, user_id) do update
set
  role = coalesce(public.workspace_members.role, excluded.role),
  status = coalesce(public.workspace_members.status, excluded.status),
  email = coalesce(public.workspace_members.email, excluded.email),
  display_name = coalesce(public.workspace_members.display_name, excluded.display_name);

drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members"
  on public.workspaces for select
  using (
    owner_id = auth.uid()
    or id in (
      select wm.workspace_id
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.status = 'active'
    )
  );
