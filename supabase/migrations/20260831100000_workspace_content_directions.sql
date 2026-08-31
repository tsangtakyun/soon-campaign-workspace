alter table public.workspaces
  add column if not exists content_directions jsonb not null default '[]'::jsonb;

update public.workspaces
set content_directions = '["城市熱話與文化", "影視娛樂", "生活日常", "品牌與商業"]'::jsonb
where content_directions = '[]'::jsonb
  and lower(name) like '%egg%';

update public.workspaces
set content_directions = '["寵物", "生活日常"]'::jsonb
where content_directions = '[]'::jsonb
  and (lower(name) like '%bechill%' or lower(name) like '%bunchill%' or name like '%笨chill%');

comment on column public.workspaces.content_directions is
  'Workspace-level content directions used to rank the shared public topic library.';
