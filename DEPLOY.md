# Deployment checklist

## Scheduled publishing

Before deploying, set `CRON_SECRET` in all three Vercel environments: Development, Preview, and Production. Vercel Cron sends this value as `Authorization: Bearer <CRON_SECRET>` when invoking `/api/posts/publish-due`.

Do not deploy scheduled publishing without this variable. A missing or mismatched value causes the endpoint to return `401` and no scheduled posts will be processed.
