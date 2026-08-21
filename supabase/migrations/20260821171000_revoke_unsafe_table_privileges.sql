-- RLS does not apply to TRUNCATE. Client roles must never receive table-level
-- destructive or schema-coupling privileges on public tables.
revoke truncate, references, trigger on all tables in schema public
  from anon, authenticated;

-- Keep future postgres-created tables safe as well. Data privileges are
-- intentionally unchanged here because some tables rely on RLS client access.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;
