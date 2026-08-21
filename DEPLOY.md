# Deployment checklist

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
