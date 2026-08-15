# Import Generated Posts

Use this after a content/image-generation chat has produced `SOON_IMPORT_JSON` and image files.

```bash
npm run import:generated -- ./imports/egg-week.json --assets /Users/tommytsang/Documents/EGG_IG_Carosuell
```

The JSON must be an array. Each item needs:

- `workspace`: usually `Egg.soon`
- `status`: `pending_approval` or `approved`
- `content_category`: one of Egg.soon categories
- `post_type`: `carousel`, `single_image`, `threads_post`, or `short_video`
- `title`
- `caption`
- `scheduled_at_hkt`: `YYYY-MM-DD HH:mm`
- `platforms`
- `assets`: each item needs `filename`
- `approval_note`

The importer uploads local assets to Supabase `public-assets`, creates/imports a marketing campaign for the day, and inserts rows into `campaign_posts`.

Imported `pending_approval` posts are stored as `ready`, so they appear on the SOON homepage approval area and `scheduled-posts`.
