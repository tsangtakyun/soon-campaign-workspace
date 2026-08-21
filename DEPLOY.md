# Deployment checklist

## Scheduled publishing

Before deploying, set `CRON_SECRET` in all three Vercel environments: Development, Preview, and Production. Vercel Cron sends this value as `Authorization: Bearer <CRON_SECRET>` when invoking `/api/posts/publish-due`.

Do not deploy scheduled publishing without this variable. A missing or mismatched value causes the endpoint to return `401` and no scheduled posts will be processed.

## Migration ordering

Apply these migrations to the target Supabase database **before** deploying the application code, in this exact order:

1. `supabase/migrations/20260821142500_review_notes.sql`
2. `supabase/migrations/20260821150000_publishing_lease.sql`

Do not deploy the code first. The scheduled publishing route writes `campaign_posts.publishing_started_at`; deploying it before the second migration will stop scheduled publishing because that column will not exist yet. Re-run both migrations once in staging to verify idempotency before any production deployment.
