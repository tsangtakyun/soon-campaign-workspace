-- A signed-in SOON user can manage more than one workspace, and each workspace
-- must be able to connect its own account for the same social platform.
alter table public.social_connections
  drop constraint if exists social_connections_user_platform_key;

-- Preserve the legacy one-connection-per-user rule only for records that have
-- not yet been claimed by a workspace. Workspace records are protected by
-- social_connections_workspace_platform_unique.
create unique index if not exists social_connections_unscoped_user_platform_unique
  on public.social_connections(user_id, platform)
  where workspace_id is null and user_id is not null;
