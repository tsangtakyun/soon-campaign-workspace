-- Allow authenticated users to read their own workspace memberships.
-- Without this policy, the sidebar client query can return an empty list even
-- when workspace_members contains the correct owner rows.

alter table public.workspace_members enable row level security;

drop policy if exists "Users can view own workspace memberships" on public.workspace_members;
create policy "Users can view own workspace memberships"
  on public.workspace_members for select
  using (user_id = auth.uid());
