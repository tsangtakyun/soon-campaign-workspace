-- T21 removed inherited data privileges from future postgres-created objects.
-- Keep client roles private while restoring the server-side application role.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  grant all on tables to service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to service_role;

-- Hosted Supabase does not allow the migration postgres role to alter the
-- platform-owned supabase_admin defaults. Attempt it so self-hosted/admin runs
-- apply the same rule, but make the hosted limitation explicit in the logs.
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public grant all on tables to service_role';
  execute 'alter default privileges for role supabase_admin in schema public grant all on sequences to service_role';
exception
  when insufficient_privilege then
    raise warning 'SUPABASE_ADMIN_DEFAULT_ACL_UNCHANGED: requires Supabase platform-admin execution';
end
$$;
