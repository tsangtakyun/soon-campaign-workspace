-- New public tables and sequences are private by default.
-- Apply this for both roles that create objects in the Supabase public schema.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

-- supabase_admin is a platform-owned superuser. A normal migration role cannot
-- impersonate it, so keep the migration repeatable and surface the required
-- Data API setting instead of aborting after securing the postgres defaults.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
exception
  when insufficient_privilege then
    raise warning 'Disable Data API "Default privileges for new entities" to revoke supabase_admin defaults';
end
$$;
