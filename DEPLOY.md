# Deployment checklist

## Canonical production branch

Vercel project `prj_1zl1QCAlpRJ1g3JKqUVeVCBiHelP` is linked to GitHub with
`codex/recover-campaign-workspace-work` as its production branch. The deployment
serving `sooncreator.network` on 2026-09-03 was built from this line. Treat this
branch as the canonical production source and deploy through the Vercel Git
integration by pushing reviewed commits to it. Do not use local `vercel --prod`.

`main` is a divergent legacy product line containing older editor, KOL matching,
PR project, and public marketing work. Do not merge it wholesale into the
production branch and do not change Vercel's production branch back to `main`.
Port individual legacy features only after a file-level review and regression
test against the current onboarding and workspace architecture.

## Scheduled publishing

Before deploying, set `CRON_SECRET` in all three Vercel environments: Development, Preview, and Production. Vercel Cron sends this value as `Authorization: Bearer <CRON_SECRET>` when invoking `/api/posts/publish-due`.

Do not deploy scheduled publishing without this variable. A missing or mismatched value causes the endpoint to return `401` and no scheduled posts will be processed.

## Migration ordering

Apply these migrations to the target Supabase database **before** deploying the application code, in this exact order:

1. `supabase/migrations/20260821142500_review_notes.sql`
2. `supabase/migrations/20260821150000_publishing_lease.sql`

Do not deploy the code first. The scheduled publishing route writes `campaign_posts.publishing_started_at`; deploying it before the second migration will stop scheduled publishing because that column will not exist yet. Re-run both migrations once in staging to verify idempotency before any production deployment.

## Production schema baseline

`supabase/schema_snapshot.sql` is the schema-only snapshot of the production `public` schema captured on 2026-08-21. It contains no table rows. It is the authoritative recovery source for constraints, indexes, functions, policies, and triggers that were missing from the historical `2026052*_remote_history.sql` placeholders.

`supabase/migrations/20260821155000_baseline_from_production.sql` mirrors all production table definitions with `CREATE TABLE IF NOT EXISTS`. Existing environments can apply it safely; a completely empty recovery environment should restore `schema_snapshot.sql` to recover the full schema rather than relying on the table-only baseline by itself.

## Migration files

The ten `supabase/migrations/2026052*_remote_history.sql` files are 82-byte empty placeholders created by migration-history reconciliation. They do not create any schema. The real baseline DDL is `supabase/migrations/20260821155000_baseline_from_production.sql`; rebuilding a new environment must use that baseline rather than the remote-history placeholders.

## New table standard

Do not create production tables directly in the Supabase Dashboard. Every new table must be introduced by a committed migration that, in the same migration:

1. enables row-level security;
2. adds the required policies for the intended roles, or explicitly grants only the minimum table and sequence privileges required; and
3. leaves `anon` and `authenticated` without access unless that access is deliberately documented and tested.

The production default privileges intentionally deny new tables and sequences to `anon` and `authenticated`. A new table is therefore private until its migration explicitly opens the required operations.

The `supabase_admin` defaults are owned by Supabase's internal platform superuser and cannot be changed by the project migration role. Keep **Integrations → Data API → Default privileges for new entities** disabled in every Supabase environment; this is the platform-side half of the same deny-by-default control.

New functions are also private by default. Any RPC intended for direct client use must receive an explicit, least-privilege `GRANT EXECUTE` in the same migration; otherwise `anon` and `authenticated` will receive `permission denied`.

## Known debt

- `origin/main` and `codex/recover-campaign-workspace-work` are divergent from merge base `4f12449`. As verified on 2026-09-04, `main` has 157 unique commits and the remote production branch has 131. Preserve `main` as a legacy feature source; inventory and port wanted features individually rather than attempting a wholesale merge.
- The `supabase_admin` default ACL still mentions `anon` and `authenticated`. Both projects currently have zero tables owned by `supabase_admin`, so this is a theoretical residual rather than a current exposure.
- `defacl_postgres_f` is `{postgres=X}`. Every new client-callable function must explicitly grant the minimum required `EXECUTE` privilege.
- `withWorkspaceAuth()` is not mechanically enforced. Approximately 26 routes using `createAdminSupabase()` remain to be migrated.
- `content_strategy_library`, `creator_usage_ledger`, and `strategy_library` have RLS enabled with no policies. Both repositories have been checked for client usage and have none, so remaining locked is intentional.
- `META_APP_LIVE` is a Vercel Sensitive variable, so its stored value cannot be read back. Determining it requires deliberately overwriting it with an explicit value: keep it `false` while the Meta App is not Live, and change it to `true` only after App Review succeeds. Tommy must authorize that change; do not alter it as part of a routine deployment.
- `publish-due` recovers stale publishing leases at the start of the same cron run. A post that repeatedly times out can therefore be retried every 10 minutes without a retry ceiling, backoff, or alert. Add a retry counter and move posts to `failed` with an alert after the agreed maximum number of attempts.
