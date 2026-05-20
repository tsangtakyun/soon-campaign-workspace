-- Create brand-assets storage bucket if it doesn't exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  10485760,  -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- RLS policies for brand-assets bucket
create policy "Users can upload to brand-assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their brand-assets"
on storage.objects for select
to authenticated
using (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public can view brand-assets"
on storage.objects for select
to anon
using (bucket_id = 'brand-assets');

create policy "Users can delete their brand-assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
