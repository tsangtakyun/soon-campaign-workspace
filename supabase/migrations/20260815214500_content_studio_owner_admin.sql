create or replace function public.can_manage_content_studio(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and wm.role = 'admin'
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke all on function public.can_manage_content_studio(uuid) from public;
grant execute on function public.can_manage_content_studio(uuid) to authenticated;

drop policy if exists "Workspace members read content projects" on public.content_projects;
drop policy if exists "Workspace editors create content projects" on public.content_projects;
drop policy if exists "Workspace editors update content projects" on public.content_projects;
drop policy if exists "Workspace editors delete content projects" on public.content_projects;

create policy "Owner and admin read content projects"
  on public.content_projects for select
  using (public.can_manage_content_studio(workspace_id));

create policy "Owner and admin create content projects"
  on public.content_projects for insert
  with check (public.can_manage_content_studio(workspace_id));

create policy "Owner and admin update content projects"
  on public.content_projects for update
  using (public.can_manage_content_studio(workspace_id))
  with check (public.can_manage_content_studio(workspace_id));

create policy "Owner and admin delete content projects"
  on public.content_projects for delete
  using (public.can_manage_content_studio(workspace_id));
