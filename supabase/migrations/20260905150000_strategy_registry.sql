-- Versioned central strategy registry shared by onboarding and product campaigns.

create table if not exists public.strategy_definitions (
  id text primary key,
  strategy_type text not null check (strategy_type in (
    'content_strategy', 'angle_pattern', 'objective', 'funnel_stage',
    'format', 'deliverable_recipe', 'success_metric', 'risk_rule'
  )),
  name text not null,
  name_zh text,
  description text,
  is_active boolean not null default true,
  active_version integer,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategy_versions (
  id uuid primary key default gen_random_uuid(),
  strategy_id text not null references public.strategy_definitions(id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  definition jsonb not null default '{}'::jsonb,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(strategy_id, version)
);

create table if not exists public.campaign_strategy_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  campaign_angle_id uuid references public.campaign_angles(id) on delete cascade,
  strategy_id text not null references public.strategy_definitions(id) on delete restrict,
  strategy_version_id uuid not null references public.strategy_versions(id) on delete restrict,
  usage_role text not null default 'building_block',
  created_at timestamptz not null default now(),
  unique(campaign_id, campaign_angle_id, strategy_version_id, usage_role)
);

create index if not exists idx_strategy_definitions_type_active
  on public.strategy_definitions(strategy_type, is_active, updated_at desc);
create index if not exists idx_strategy_versions_published
  on public.strategy_versions(strategy_id, status, version desc);
create index if not exists idx_campaign_strategy_usage_campaign
  on public.campaign_strategy_usage(campaign_id, campaign_angle_id);

alter table public.strategy_definitions enable row level security;
alter table public.strategy_versions enable row level security;
alter table public.campaign_strategy_usage enable row level security;

drop policy if exists "Authenticated users read active strategies" on public.strategy_definitions;
create policy "Authenticated users read active strategies" on public.strategy_definitions
  for select to authenticated using (is_active = true);

drop policy if exists "Authenticated users read published strategy versions" on public.strategy_versions;
create policy "Authenticated users read published strategy versions" on public.strategy_versions
  for select to authenticated using (status = 'published');

drop policy if exists "Workspace members read campaign strategy usage" on public.campaign_strategy_usage;
create policy "Workspace members read campaign strategy usage" on public.campaign_strategy_usage
  for select using (public.is_workspace_member(workspace_id));
drop policy if exists "Workspace editors insert campaign strategy usage" on public.campaign_strategy_usage;
create policy "Workspace editors insert campaign strategy usage" on public.campaign_strategy_usage
  for insert with check (public.can_edit_workspace(workspace_id));
drop policy if exists "Workspace editors update campaign strategy usage" on public.campaign_strategy_usage;
create policy "Workspace editors update campaign strategy usage" on public.campaign_strategy_usage
  for update using (public.can_edit_workspace(workspace_id)) with check (public.can_edit_workspace(workspace_id));
drop policy if exists "Workspace editors delete campaign strategy usage" on public.campaign_strategy_usage;
create policy "Workspace editors delete campaign strategy usage" on public.campaign_strategy_usage
  for delete using (public.can_edit_workspace(workspace_id));

grant select on public.strategy_definitions to authenticated;
grant select on public.strategy_versions to authenticated;
grant select, insert, update, delete on public.campaign_strategy_usage to authenticated;

-- The 16 existing content frameworks become internal building blocks.
insert into public.strategy_definitions (id, strategy_type, name, name_zh, description, active_version)
values
  ('lifestyle-content','content_strategy','Lifestyle Content','生活方式內容','把產品或服務放入理想生活與日常場景',1),
  ('offer-promotion','content_strategy','Offer & Promotion','優惠與推廣','突出優惠、折扣、套裝或限時活動',1),
  ('product-education','content_strategy','Product Education','產品教育','拆解功能、材料、流程與專業價值',1),
  ('problem-solution','content_strategy','Problem / Solution','問題／解決方案','由受眾痛點連接到品牌解法',1),
  ('entertainment-content','content_strategy','Entertainment Content','娛樂內容','用娛樂方式吸引注意及拓展受眾',1),
  ('authority-content','content_strategy','Authority Content','建立權威','以專業分析與行內 insight 建立信任',1),
  ('opinion-hot-take','content_strategy','Opinion / Hot Take','立場內容','用清晰立場引發討論',1),
  ('storytelling','content_strategy','Storytelling','故事內容','用人物、經歷或案例建立情感連結',1),
  ('behind-the-scenes','content_strategy','Behind the Scenes','幕後內容','展示真實製作與工作過程',1),
  ('social-proof','content_strategy','Social Proof','信任證據','以評價、案例或結果降低信任成本',1),
  ('community-content','content_strategy','Community Content','互動內容','邀請受眾參與、回應及分享',1),
  ('trend-hijacking','content_strategy','Trend Hijacking','借勢內容','借熱門話題或格式連接注意力',1),
  ('personal-brand-content','content_strategy','Personal Brand Content','個人品牌內容','以人物價值觀及日常建立追隨理由',1),
  ('call-to-action-content','content_strategy','Call to Action Content','行動引導內容','明確推動下一步行動',1),
  ('contrarian-content','content_strategy','Contrarian Content','反主流內容','以認知反差打破常見假設',1),
  ('series-content','content_strategy','Series Content','連載內容','用持續格式建立回訪與期待',1)
on conflict (id) do nothing;

insert into public.strategy_versions (strategy_id, version, status, definition, change_note, published_at)
select id, 1, 'published', jsonb_build_object(
  'description', description,
  'role', 'building_block',
  'funnelStage', case
    when id in ('entertainment-content','opinion-hot-take','community-content','trend-hijacking','contrarian-content') then 'top'
    when id in ('offer-promotion','product-education','problem-solution','social-proof','call-to-action-content') then 'bottom'
    else 'middle' end,
  'isActive', true
), 'Initial version migrated from the 16-framework library', now()
from public.strategy_definitions
where strategy_type = 'content_strategy'
on conflict (strategy_id, version) do nothing;

-- Product-performance angle patterns are separate from content strategy.
insert into public.strategy_definitions (id, strategy_type, name, name_zh, description, active_version)
values
  ('angle-challenge-test','angle_pattern','Challenge / Test','實測挑戰','用清楚條件及時間框架展示測試',1),
  ('angle-comparison','angle_pattern','Comparison','對比比較','比較價格、做法、選項或使用結果',1),
  ('angle-problem-solution','angle_pattern','Problem / Solution','痛點解法','由具體痛點切入產品或服務解法',1),
  ('angle-mistakes','angle_pattern','Mistakes','常見錯誤','指出受眾常犯錯誤並提供改善方法',1),
  ('angle-demonstration','angle_pattern','Demonstration','產品示範','以實際使用展示功能與效果',1),
  ('angle-pov','angle_pattern','POV','POV 情境','把受眾放入有共鳴的第一身情境',1),
  ('angle-before-after','angle_pattern','Before / After','前後轉變','展示前後狀態及轉變過程',1),
  ('angle-objection','angle_pattern','Objection Handling','消除疑慮','直接回應購買前的主要阻力',1),
  ('angle-testimonial','angle_pattern','Testimonial','用戶見證','以真實用戶經驗建立信任',1),
  ('angle-price-anchor','angle_pattern','Price Anchoring','價格定位','用價值或替代方案建立價格參照',1),
  ('angle-myth-busting','angle_pattern','Myth Busting','破解迷思','挑戰常見認知並提供證據',1),
  ('angle-routine','angle_pattern','Routine Integration','日常融入','把產品或服務放入日常習慣',1),
  ('angle-founder-story','angle_pattern','Founder Story','創辦故事','以創辦原因及人物信念建立連結',1),
  ('angle-product-in-use','angle_pattern','Product in Use','使用情境','展示產品在真實場景中的用途',1),
  ('angle-limited-offer','angle_pattern','Limited Offer','限時推廣','用限時、名額或套裝推動行動',1)
on conflict (id) do nothing;

insert into public.strategy_versions (strategy_id, version, status, definition, change_note, published_at)
select id, 1, 'published', jsonb_build_object(
  'description', description,
  'requiredEvidence', case
    when id in ('angle-before-after','angle-testimonial','angle-myth-busting','angle-challenge-test') then jsonb_build_array('brand-confirmed proof')
    else '[]'::jsonb end,
  'recommendedFormats', case
    when id in ('angle-demonstration','angle-pov','angle-product-in-use') then jsonb_build_array('short_video','carousel')
    else jsonb_build_array('short_video','carousel','single_image') end,
  'isActive', true
), 'Initial product campaign angle pattern', now()
from public.strategy_definitions
where strategy_type = 'angle_pattern'
on conflict (strategy_id, version) do nothing;
