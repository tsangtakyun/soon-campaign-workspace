-- Make workspace membership the canonical access boundary for shared dashboard data.
-- Owners/admins/members may edit; viewers are read-only.

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and wm.role in ('owner', 'admin', 'member')
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.can_edit_workspace(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;

alter table public.designs
  add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;

update public.designs d
set workspace_id = (
  select w.id
  from public.workspaces w
  where w.owner_id = d.user_id
  order by w.created_at asc
  limit 1
)
where d.workspace_id is null and d.user_id is not null;

create index if not exists idx_designs_workspace on public.designs(workspace_id);

-- Keep anonymous onboarding available, while making claimed records shared by workspace.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'brand_kits',
    'brand_assets',
    'content_preferences',
    'marketing_campaigns',
    'campaign_posts',
    'designs',
    'social_connections'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Workspace members can read" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can insert" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can update" on public.%I', table_name);
    execute format('drop policy if exists "Workspace editors can delete" on public.%I', table_name);

    execute format(
      'create policy "Workspace members can read" on public.%I for select using (workspace_id is not null and public.is_workspace_member(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can insert" on public.%I for insert with check (workspace_id is not null and public.can_edit_workspace(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can update" on public.%I for update using (workspace_id is not null and public.can_edit_workspace(workspace_id)) with check (workspace_id is not null and public.can_edit_workspace(workspace_id))',
      table_name
    );
    execute format(
      'create policy "Workspace editors can delete" on public.%I for delete using (workspace_id is not null and public.can_edit_workspace(workspace_id))',
      table_name
    );
  end loop;
end $$;

-- A membership accepted by email should become tied to the authenticated user.
update public.workspace_members wm
set user_id = u.id
from auth.users u
where wm.user_id is null
  and wm.email is not null
  and lower(wm.email) = lower(u.email);
