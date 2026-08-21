--
-- PostgreSQL database dump
--

\restrict P6KOvKaubygJc5cSaZfIcLaN9at72pQzRbEru6pywLRCcZpEIq3IlYOtJZ3Qk9R

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: can_access_clip("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_access_clip"("target_clip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.clips
    where id = target_clip_id
      and public.is_room_member(room_id)
  );
$$;


--
-- Name: can_edit_workspace("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_edit_workspace"("target_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and wm.role in ('owner', 'admin', 'member')
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;


--
-- Name: can_manage_content_studio("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."can_manage_content_studio"("target_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id and w.owner_id = auth.uid()
  ) or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and wm.role = 'admin'
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;


--
-- Name: get_my_rooms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_my_rooms"() RETURNS TABLE("room_id" "uuid", "code" "text", "created_by" "uuid", "name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    rm.room_id,
    r.code,
    r.created_by,
    r.name
  from public.room_members rm
  join public.rooms r on r.id = rm.room_id
  where rm.user_id = auth.uid();
$$;


--
-- Name: get_room_members_snapshot("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."get_room_members_snapshot"("target_room_id" "uuid") RETURNS TABLE("user_id" "uuid", "username" "text", "avatar_url" "text", "expo_push_token" "text", "country_code" "text", "location_label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    rm.user_id,
    p.username,
    p.avatar_url,
    p.expo_push_token,
    p.country_code,
    p.location_label
  from public.room_members rm
  left join public.profiles p on p.id = rm.user_id
  where rm.room_id = target_room_id
    and public.is_room_member(target_room_id);
$$;


--
-- Name: is_room_member("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_room_member"("target_room_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.room_members
    where room_id = target_room_id
      and user_id = auth.uid()
  );
$$;


--
-- Name: is_workspace_member("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."is_workspace_member"("target_workspace_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.status = 'active'
      and (
        wm.user_id = auth.uid()
        or lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;


--
-- Name: leave_room("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."leave_room"("target_room_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  remaining_members integer;
begin
  delete from public.room_members
  where room_id = target_room_id
    and user_id = auth.uid();

  select count(*)
  into remaining_members
  from public.room_members
  where room_id = target_room_id;

  if remaining_members = 0 then
    delete from public.rooms
    where id = target_room_id
      and created_by = auth.uid();
  end if;
end;
$$;


--
-- Name: shares_room_with("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."shares_room_with"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.room_members mine
    join public.room_members theirs on theirs.room_id = mine.room_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: brand_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "brand_kit_id" "uuid",
    "asset_type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "filename" "text",
    "is_used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "workspace_id" "uuid",
    "source_url" "text"
);


--
-- Name: brand_kits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_kits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "business_name" "text",
    "business_type" "text",
    "website_url" "text",
    "elevator_pitch" "text",
    "language" "text" DEFAULT 'zh-HK'::"text",
    "logo_url" "text",
    "audience" "jsonb",
    "content_people" "jsonb",
    "market_positioning" "jsonb",
    "brand_profile" "jsonb",
    "visual_style_id" "text",
    "visual_style_title" "text",
    "visual_style_preview" "text",
    "typeface_id" "text",
    "typeface_family" "text",
    "typeface_weight" "text",
    "raw_website_analysis" "jsonb",
    "raw_business_profile" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "claimed_at" timestamp with time zone,
    "typeface_direction" "text",
    "typeface_name" "text",
    "typeface_name_en" "text",
    "typeface_cdn_url" "text",
    "visual_style_keywords" "text",
    "workspace_id" "uuid"
);


--
-- Name: brand_perks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_perks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "requirements" "text",
    "quota" integer DEFAULT 10,
    "valid_until" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contact_name" "text",
    "contact_phone" "text",
    "contact_email" "text",
    CONSTRAINT "brand_perks_type_check" CHECK (("type" = ANY (ARRAY['service'::"text", 'product'::"text"])))
);


--
-- Name: brand_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "business_name" "text",
    "business_overview" "text",
    "market_positioning" "jsonb",
    "competitors" "jsonb",
    "competitive_advantages" "jsonb",
    "customer_segments" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: brand_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" DEFAULT 'website'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_scanned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brand_sources_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scanning'::"text", 'done'::"text", 'error'::"text"])))
);


--
-- Name: brand_voices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_voices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "purpose" "text",
    "audience" "text",
    "tone" "jsonb",
    "emotion" "jsonb",
    "character" "jsonb",
    "syntax" "jsonb",
    "language" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: campaign_intakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."campaign_intakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "objective" "text" DEFAULT ''::"text" NOT NULL,
    "business_name" "text" DEFAULT ''::"text" NOT NULL,
    "whatsapp" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "campaign_title" "text" DEFAULT ''::"text" NOT NULL,
    "vertical" "text" DEFAULT ''::"text" NOT NULL,
    "budget_range" "text" DEFAULT ''::"text" NOT NULL,
    "brief" "text" DEFAULT ''::"text" NOT NULL,
    "must_include" "text" DEFAULT ''::"text" NOT NULL,
    "ai_summary" "text" DEFAULT ''::"text" NOT NULL,
    "suggested_budget_shape" "text" DEFAULT ''::"text" NOT NULL,
    "suggested_angle" "text" DEFAULT ''::"text" NOT NULL,
    "suggested_deliverable_shape" "text" DEFAULT ''::"text" NOT NULL,
    "payment_status" "text" DEFAULT ''::"text" NOT NULL,
    "payment_session_id" "text" DEFAULT ''::"text" NOT NULL,
    "stripe_customer_email" "text" DEFAULT ''::"text" NOT NULL,
    "stripe_payment_mode" "text" DEFAULT ''::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "full_analysis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_channel" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: campaign_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."campaign_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "campaign_id" "uuid",
    "source_key" "text" DEFAULT ''::"text" NOT NULL,
    "title" "text",
    "body" "text",
    "post_type" "text",
    "scheduled_at" timestamp with time zone,
    "image_url" "text",
    "design_id" "text",
    "canvas_json" "jsonb",
    "captions" "jsonb",
    "status" "text" DEFAULT 'draft'::"text",
    "approved_at" timestamp with time zone,
    "posted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "visual_style" "text",
    "content_mood" "text"[],
    "typeface" "text",
    "photo_control" "text",
    "workspace_id" "uuid"
);


--
-- Name: caption_examples; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."caption_examples" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "content_mood" "text" NOT NULL,
    "style_tag" "text" NOT NULL,
    "tone" "text" NOT NULL,
    "language" "text" NOT NULL,
    "caption_text" "text" NOT NULL,
    "hook_type" "text",
    "hook_line" "text",
    "cta_present" boolean DEFAULT false,
    "cta_text" "text",
    "why_it_works" "text" NOT NULL,
    "pattern_notes" "text",
    "source" "text" DEFAULT 'manual'::"text",
    "industry" "text",
    "brand_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "caption_examples_content_mood_check" CHECK (("content_mood" = ANY (ARRAY['搞笑'::"text", '廣告'::"text", '教學'::"text", '分享'::"text", '情感'::"text", '懸疑'::"text", '勵志'::"text", '生活'::"text"]))),
    CONSTRAINT "caption_examples_language_check" CHECK (("language" = ANY (ARRAY['廣東話'::"text", '普通話'::"text", '英文'::"text", '混合'::"text"]))),
    CONSTRAINT "caption_examples_platform_check" CHECK (("platform" = ANY (ARRAY['IG'::"text", 'Threads'::"text", 'XHS'::"text", 'TikTok'::"text", 'YouTube'::"text", 'Mixed'::"text"])))
);


--
-- Name: clip_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."clip_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: clip_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."clip_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: clip_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."clip_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid",
    "reason" "text" DEFAULT 'inappropriate'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: clips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."clips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "video_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "local_time" "text",
    "caption" "text",
    "background_color" "text",
    "country_code" "text",
    "location_label" "text",
    "time_str" "text",
    "date_str" "text",
    "text_size" "text",
    "caption_align" "text",
    "time_font" integer,
    "date_font" integer,
    "caption_font" integer,
    "overlay_enabled" boolean DEFAULT false NOT NULL,
    "thumbnail_url" "text"
);


--
-- Name: content_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."content_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "channels" "jsonb",
    "channel_ids" "jsonb",
    "schedule" "jsonb",
    "cross_posting" boolean DEFAULT false,
    "content_mix" "jsonb",
    "photo_control_id" "text",
    "photo_control_title" "text",
    "photo_control_preview" "text",
    "raw_distribution" "jsonb",
    "raw_content_mix" "jsonb",
    "raw_photo_control" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "claimed_at" timestamp with time zone,
    "photo_control_prompt" "text",
    "content_mood" "jsonb",
    "workspace_id" "uuid"
);


--
-- Name: content_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."content_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "topic_idea_id" "uuid",
    "prompt_version_id" "uuid",
    "title" "text" NOT NULL,
    "source_url" "text",
    "source_name" "text",
    "source_note" "text",
    "stage" "text" DEFAULT 'brief'::"text" NOT NULL,
    "selected_format" "text",
    "brief" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "format_decision" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "production" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_projects_stage_check" CHECK (("stage" = ANY (ARRAY['brief'::"text", 'format'::"text", 'production'::"text", 'approval'::"text", 'scheduled'::"text", 'archived'::"text"])))
);


--
-- Name: content_strategy_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."content_strategy_library" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: creator_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."creator_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_name" "text" DEFAULT ''::"text" NOT NULL,
    "contact_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "whatsapp" "text" DEFAULT ''::"text" NOT NULL,
    "location" "text" DEFAULT ''::"text" NOT NULL,
    "languages" "text" DEFAULT ''::"text" NOT NULL,
    "primary_platform" "text" DEFAULT ''::"text" NOT NULL,
    "instagram_url" "text" DEFAULT ''::"text" NOT NULL,
    "tiktok_url" "text" DEFAULT ''::"text" NOT NULL,
    "youtube_url" "text" DEFAULT ''::"text" NOT NULL,
    "threads_url" "text" DEFAULT ''::"text" NOT NULL,
    "xiaohongshu_url" "text" DEFAULT ''::"text" NOT NULL,
    "other_links" "text" DEFAULT ''::"text" NOT NULL,
    "content_categories" "text" DEFAULT ''::"text" NOT NULL,
    "content_formats" "text" DEFAULT ''::"text" NOT NULL,
    "audience_regions" "text" DEFAULT ''::"text" NOT NULL,
    "audience_age_groups" "text" DEFAULT ''::"text" NOT NULL,
    "has_brand_collabs" "text" DEFAULT ''::"text" NOT NULL,
    "has_conversion_campaigns" "text" DEFAULT ''::"text" NOT NULL,
    "usual_reel_rate" "text" DEFAULT ''::"text" NOT NULL,
    "available_regions" "text" DEFAULT ''::"text" NOT NULL,
    "turnaround_days" "text" DEFAULT ''::"text" NOT NULL,
    "top_content_links" "text" DEFAULT ''::"text" NOT NULL,
    "analytics_notes" "text" DEFAULT ''::"text" NOT NULL,
    "analytics_drive_links" "text" DEFAULT ''::"text" NOT NULL,
    "selected_plan" "text" DEFAULT 'creator-core'::"text" NOT NULL,
    "ai_analysis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "review_status" "text" DEFAULT 'new'::"text" NOT NULL,
    "internal_notes" "text" DEFAULT ''::"text" NOT NULL,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usual_post_rate" "text" DEFAULT ''::"text" NOT NULL,
    "usual_story_rate" "text" DEFAULT ''::"text" NOT NULL,
    "plan_payment_status" "text" DEFAULT 'not_required'::"text" NOT NULL,
    "plan_payment_session_id" "text" DEFAULT ''::"text" NOT NULL,
    "stripe_customer_email" "text" DEFAULT ''::"text" NOT NULL,
    "plan_paid_at" timestamp with time zone
);


--
-- Name: creator_usage_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."creator_usage_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "tool_slug" "text" DEFAULT ''::"text" NOT NULL,
    "credits_used" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "content_type" "text",
    "campaign_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_transactions_type_check" CHECK (("type" = ANY (ARRAY['earned'::"text", 'spent'::"text", 'refunded'::"text", 'bonus'::"text"])))
);


--
-- Name: designs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "post_id" "uuid",
    "name" "text" DEFAULT 'Untitled'::"text",
    "canvas_json" "jsonb",
    "thumbnail_url" "text",
    "canvas_width" integer DEFAULT 1080,
    "canvas_height" integer DEFAULT 1080,
    "is_draft" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "workspace_id" "uuid"
);


--
-- Name: doc_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."doc_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "workspace_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."docs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "title" "text" NOT NULL,
    "template_type" "text",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "invoice_status" "text" DEFAULT 'draft'::"text",
    "invoice_amount" numeric DEFAULT 0,
    "invoice_client" "text",
    "invoice_date" "date",
    "invoice_due_date" "date",
    "invoice_currency" "text" DEFAULT 'HK$'::"text",
    "created_by" "uuid"
);


--
-- Name: COLUMN "docs"."invoice_status"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."docs"."invoice_status" IS 'Invoice workflow status: draft / issued / sent_for_approval / paid / overdue';


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "merchant" "text",
    "description" "text",
    "amount" numeric DEFAULT 0 NOT NULL,
    "original_amount" numeric,
    "original_currency" "text",
    "converted_amount" numeric,
    "converted_currency" "text",
    "exchange_rate" numeric,
    "category" "text" DEFAULT '雜項'::"text",
    "receipt_images" "jsonb" DEFAULT '[]'::"jsonb",
    "ai_extracted" boolean DEFAULT false,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


--
-- Name: financial_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."financial_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "year" integer,
    "month" integer,
    "total_income" numeric DEFAULT 0,
    "total_expenses" numeric DEFAULT 0,
    "net_amount" numeric DEFAULT 0,
    "report_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "token" "text" DEFAULT ("gen_random_uuid"())::"text",
    "invited_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval),
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: kol_campaign_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."kol_campaign_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "workspace_id" "uuid",
    "egg_creator_id" "uuid" NOT NULL,
    "creator_username" "text",
    "creator_display_name" "text",
    "creator_avatar_url" "text",
    "creator_ig_handle" "text",
    "creator_ig_followers" integer DEFAULT 0,
    "creator_mediakit_url" "text",
    "pitch_message" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "notes" "text"
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."marketing_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "source_key" "text" DEFAULT 'onboarding-v1'::"text" NOT NULL,
    "name" "text" NOT NULL,
    "theme" "text",
    "call_to_action" "text",
    "target_link" "text",
    "strategy_id" "text",
    "strategy_title" "text",
    "strategy_emoji" "text",
    "funnel_stage" "text",
    "starts_on" "date",
    "duration_weeks" integer DEFAULT 1,
    "status" "text" DEFAULT 'draft'::"text",
    "campaign_themes" "jsonb",
    "topic_review" "jsonb",
    "raw_campaign_details" "jsonb",
    "raw_campaign_themes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "claimed_at" timestamp with time zone,
    "workspace_id" "uuid",
    "cover_image_url" "text",
    "target_audience" "text",
    "kol_open" boolean DEFAULT false
);


--
-- Name: perk_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."perk_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "perk_id" "uuid",
    "egg_creator_username" "text" NOT NULL,
    "type" "text" NOT NULL,
    "preferred_date" "date",
    "preferred_time" "text",
    "party_size" integer DEFAULT 1,
    "delivery_name" "text",
    "delivery_phone" "text",
    "delivery_address" "text",
    "delivery_district" "text",
    "delivery_notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "claimed_at" timestamp with time zone DEFAULT "now"(),
    "brand_notes" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "country_code" "text",
    "location_label" "text",
    "avatar_url" "text",
    "expo_push_token" "text"
);


--
-- Name: project_briefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."project_briefs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "campaign_id" "uuid",
    "creator_username" "text" NOT NULL,
    "creator_egg_id" "text",
    "title" "text" NOT NULL,
    "background" "text",
    "objectives" "text",
    "deliverables" "text"[],
    "timeline" "text",
    "budget" "text",
    "dos" "text",
    "donts" "text",
    "reference_links" "text"[],
    "additional_notes" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "kol_confirmed_at" timestamp with time zone,
    "kol_first_submission_date" "date",
    "kol_final_submission_date" "date",
    "kol_confirmation_notes" "text",
    "deal_status" "text" DEFAULT 'sent'::"text"
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "title" "text" NOT NULL,
    "type" "text" DEFAULT 'youtube'::"text",
    "host" "text",
    "owner" "text",
    "shoot_date" "date",
    "status" "text" DEFAULT '1. 未拍攝'::"text",
    "current_stage" "text" DEFAULT '未寫稿'::"text",
    "pipeline_step" "text" DEFAULT 'idea'::"text",
    "languages" integer DEFAULT 3,
    "category" "text" DEFAULT 'youtube'::"text",
    "output_url" "text",
    "last_visited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "publish_date" "date",
    "created_by" "uuid"
);


--
-- Name: reply_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reply_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" DEFAULT 'tommy'::"text",
    "inbox_type" "text" NOT NULL,
    "assistant_name" "text" DEFAULT 'Mayan'::"text",
    "tone" "text" DEFAULT 'friendly'::"text",
    "reply_length" "text" DEFAULT 'standard'::"text",
    "creator_context" "text",
    "avoid_topics" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: reply_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."reply_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "inbox_type" "text" NOT NULL,
    "sender_name" "text",
    "sender_handle" "text",
    "original_message" "text" NOT NULL,
    "ai_reply" "text",
    "user_edited_reply" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "notes" "text",
    "follow_up_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


--
-- Name: room_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."room_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp without time zone DEFAULT "now"()
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "name" "text"
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" DEFAULT 'tommy'::"text",
    "company_name" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "bank_name" "text",
    "account_name" "text",
    "account_number" "text",
    "tax_rate" numeric DEFAULT 0,
    "default_rates" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "logo_base64" "text",
    "display_name" "text" DEFAULT 'Tommy'::"text",
    "default_currency" "text" DEFAULT 'HK$'::"text",
    "invoice_prefix" "text" DEFAULT 'INV'::"text",
    "invoice_start_number" integer DEFAULT 1,
    "invoice_current_number" integer DEFAULT 0,
    "signature_base64" "text",
    "youtube_client_id" "text",
    "youtube_client_secret" "text",
    "meta_app_id" "text",
    "meta_app_secret" "text",
    "document_header_base64" "text"
);


--
-- Name: social_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."social_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "platform" "text" NOT NULL,
    "account_name" "text",
    "account_id" "text",
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "connected_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_session_id" "uuid",
    "page_id" "text",
    "page_access_token" "text",
    "workspace_id" "uuid"
);


--
-- Name: strategy_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."strategy_library" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "library" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: user_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0 NOT NULL,
    "total_earned" integer DEFAULT 0 NOT NULL,
    "total_spent" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "app_area" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: user_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."user_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_type" "text" NOT NULL,
    "monthly_credit_allowance" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone DEFAULT "now"(),
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_plans_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['trial'::"text", 'strategy-workspace'::"text", 'managed-service'::"text"])))
);


--
-- Name: workspace_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'editor'::"text" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workspace_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text", 'owner'::"text"]))),
    CONSTRAINT "workspace_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);


--
-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "display_name" "text",
    "role" "text" DEFAULT 'member'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: workspace_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: workspace_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_profiles" (
    "workspace_id" "uuid" NOT NULL,
    "slug" "text",
    "logo_url" "text",
    "brand_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "workflow_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "prompt_profile_key" "text",
    "prompt_version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: workspace_prompt_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_prompt_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" DEFAULT 'Content workflow'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "brief_prompt" "text" DEFAULT ''::"text" NOT NULL,
    "format_prompt" "text" DEFAULT ''::"text" NOT NULL,
    "production_prompt" "text" DEFAULT ''::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: workspace_topic_idea_dismissals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_topic_idea_dismissals" (
    "workspace_id" "uuid" NOT NULL,
    "idea_id" "text" NOT NULL,
    "dismissed_by" "uuid",
    "dismissed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: workspace_topic_ideas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspace_topic_ideas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "image_url" "text",
    "height" "text" DEFAULT 'medium'::"text" NOT NULL,
    "category" "text" DEFAULT 'Trending 最新資訊'::"text" NOT NULL,
    "tags" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "note" "text" DEFAULT ''::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workspace_topic_ideas_height_check" CHECK (("height" = ANY (ARRAY['short'::"text", 'medium'::"text", 'tall'::"text"])))
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" DEFAULT 'youtube'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner" "text",
    "description" "text",
    "owner_id" "uuid",
    "logo_url" "text",
    "visual_style" "text",
    "font_style" "text",
    "visual_identity_description" "text",
    "brand_colors" "jsonb",
    "avoided_keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "market_locations" "jsonb" DEFAULT '[]'::"jsonb",
    "audience_gender" "text" DEFAULT '全部性別'::"text",
    "content_persona_age" "text" DEFAULT '不限'::"text",
    "content_persona_gender" "text" DEFAULT '全部性別'::"text",
    "content_persona_ethnicity" "text" DEFAULT '不限'::"text",
    "content_modification" "text"
);


--
-- Name: brand_assets brand_assets_brand_kit_id_asset_type_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_brand_kit_id_asset_type_url_key" UNIQUE ("brand_kit_id", "asset_type", "url");


--
-- Name: brand_assets brand_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id");


--
-- Name: brand_kits brand_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id");


--
-- Name: brand_kits brand_kits_session_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_session_unique" UNIQUE ("onboarding_session_id");


--
-- Name: brand_perks brand_perks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_perks"
    ADD CONSTRAINT "brand_perks_pkey" PRIMARY KEY ("id");


--
-- Name: brand_profiles brand_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_profiles"
    ADD CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id");


--
-- Name: brand_profiles brand_profiles_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_profiles"
    ADD CONSTRAINT "brand_profiles_workspace_id_key" UNIQUE ("workspace_id");


--
-- Name: brand_sources brand_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_sources"
    ADD CONSTRAINT "brand_sources_pkey" PRIMARY KEY ("id");


--
-- Name: brand_voices brand_voices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_voices"
    ADD CONSTRAINT "brand_voices_pkey" PRIMARY KEY ("id");


--
-- Name: brand_voices brand_voices_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_voices"
    ADD CONSTRAINT "brand_voices_workspace_id_key" UNIQUE ("workspace_id");


--
-- Name: campaign_intakes campaign_intakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_intakes"
    ADD CONSTRAINT "campaign_intakes_pkey" PRIMARY KEY ("id");


--
-- Name: campaign_posts campaign_posts_campaign_id_source_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_posts"
    ADD CONSTRAINT "campaign_posts_campaign_id_source_key_key" UNIQUE ("campaign_id", "source_key");


--
-- Name: campaign_posts campaign_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_posts"
    ADD CONSTRAINT "campaign_posts_pkey" PRIMARY KEY ("id");


--
-- Name: caption_examples caption_examples_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."caption_examples"
    ADD CONSTRAINT "caption_examples_pkey" PRIMARY KEY ("id");


--
-- Name: clip_comments clip_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_comments"
    ADD CONSTRAINT "clip_comments_pkey" PRIMARY KEY ("id");


--
-- Name: clip_reactions clip_reactions_clip_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reactions"
    ADD CONSTRAINT "clip_reactions_clip_id_user_id_key" UNIQUE ("clip_id", "user_id");


--
-- Name: clip_reactions clip_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reactions"
    ADD CONSTRAINT "clip_reactions_pkey" PRIMARY KEY ("id");


--
-- Name: clip_reports clip_reports_clip_id_reporter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reports"
    ADD CONSTRAINT "clip_reports_clip_id_reporter_id_key" UNIQUE ("clip_id", "reporter_id");


--
-- Name: clip_reports clip_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reports"
    ADD CONSTRAINT "clip_reports_pkey" PRIMARY KEY ("id");


--
-- Name: clips clips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clips"
    ADD CONSTRAINT "clips_pkey" PRIMARY KEY ("id");


--
-- Name: content_preferences content_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_preferences"
    ADD CONSTRAINT "content_preferences_pkey" PRIMARY KEY ("id");


--
-- Name: content_preferences content_preferences_session_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_preferences"
    ADD CONSTRAINT "content_preferences_session_unique" UNIQUE ("onboarding_session_id");


--
-- Name: content_projects content_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_pkey" PRIMARY KEY ("id");


--
-- Name: content_strategy_library content_strategy_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_strategy_library"
    ADD CONSTRAINT "content_strategy_library_pkey" PRIMARY KEY ("id");


--
-- Name: creator_applications creator_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."creator_applications"
    ADD CONSTRAINT "creator_applications_pkey" PRIMARY KEY ("id");


--
-- Name: creator_usage_ledger creator_usage_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."creator_usage_ledger"
    ADD CONSTRAINT "creator_usage_ledger_pkey" PRIMARY KEY ("id");


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");


--
-- Name: designs designs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");


--
-- Name: doc_folders doc_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."doc_folders"
    ADD CONSTRAINT "doc_folders_pkey" PRIMARY KEY ("id");


--
-- Name: docs docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_pkey" PRIMARY KEY ("id");


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");


--
-- Name: financial_reports financial_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id");


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");


--
-- Name: kol_campaign_applications kol_campaign_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kol_campaign_applications"
    ADD CONSTRAINT "kol_campaign_applications_pkey" PRIMARY KEY ("id");


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");


--
-- Name: marketing_campaigns marketing_campaigns_session_source_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_session_source_unique" UNIQUE ("onboarding_session_id", "source_key");


--
-- Name: perk_claims perk_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."perk_claims"
    ADD CONSTRAINT "perk_claims_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: project_briefs project_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."project_briefs"
    ADD CONSTRAINT "project_briefs_pkey" PRIMARY KEY ("id");


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");


--
-- Name: reply_settings reply_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reply_settings"
    ADD CONSTRAINT "reply_settings_pkey" PRIMARY KEY ("id");


--
-- Name: reply_threads reply_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reply_threads"
    ADD CONSTRAINT "reply_threads_pkey" PRIMARY KEY ("id");


--
-- Name: room_members room_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_pkey" PRIMARY KEY ("id");


--
-- Name: rooms rooms_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_code_key" UNIQUE ("code");


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");


--
-- Name: social_connections social_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_pkey" PRIMARY KEY ("id");


--
-- Name: social_connections social_connections_session_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_session_platform_key" UNIQUE ("onboarding_session_id", "platform");


--
-- Name: social_connections social_connections_user_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_user_platform_key" UNIQUE ("user_id", "platform");


--
-- Name: strategy_library strategy_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."strategy_library"
    ADD CONSTRAINT "strategy_library_pkey" PRIMARY KEY ("id");


--
-- Name: user_credits user_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_pkey" PRIMARY KEY ("id");


--
-- Name: user_credits user_credits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_key" UNIQUE ("user_id");


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");


--
-- Name: user_plans user_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_plans"
    ADD CONSTRAINT "user_plans_pkey" PRIMARY KEY ("id");


--
-- Name: user_plans user_plans_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_plans"
    ADD CONSTRAINT "user_plans_user_id_key" UNIQUE ("user_id");


--
-- Name: workspace_invitations workspace_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id");


--
-- Name: workspace_invitations workspace_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_token_key" UNIQUE ("token");


--
-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");


--
-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");


--
-- Name: workspace_notifications workspace_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_notifications"
    ADD CONSTRAINT "workspace_notifications_pkey" PRIMARY KEY ("id");


--
-- Name: workspace_profiles workspace_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_profiles"
    ADD CONSTRAINT "workspace_profiles_pkey" PRIMARY KEY ("workspace_id");


--
-- Name: workspace_prompt_versions workspace_prompt_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_prompt_versions"
    ADD CONSTRAINT "workspace_prompt_versions_pkey" PRIMARY KEY ("id");


--
-- Name: workspace_prompt_versions workspace_prompt_versions_workspace_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_prompt_versions"
    ADD CONSTRAINT "workspace_prompt_versions_workspace_id_version_key" UNIQUE ("workspace_id", "version");


--
-- Name: workspace_topic_idea_dismissals workspace_topic_idea_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_idea_dismissals"
    ADD CONSTRAINT "workspace_topic_idea_dismissals_pkey" PRIMARY KEY ("workspace_id", "idea_id");


--
-- Name: workspace_topic_ideas workspace_topic_ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_ideas"
    ADD CONSTRAINT "workspace_topic_ideas_pkey" PRIMARY KEY ("id");


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");


--
-- Name: brand_assets_workspace_asset_url_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "brand_assets_workspace_asset_url_unique" ON "public"."brand_assets" USING "btree" ("workspace_id", "asset_type", "url") WHERE ("workspace_id" IS NOT NULL);


--
-- Name: brand_kits_workspace_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "brand_kits_workspace_unique" ON "public"."brand_kits" USING "btree" ("workspace_id") WHERE ("workspace_id" IS NOT NULL);


--
-- Name: content_preferences_workspace_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "content_preferences_workspace_unique" ON "public"."content_preferences" USING "btree" ("workspace_id") WHERE ("workspace_id" IS NOT NULL);


--
-- Name: idx_brand_assets_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_assets_session" ON "public"."brand_assets" USING "btree" ("onboarding_session_id");


--
-- Name: idx_brand_assets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_assets_user" ON "public"."brand_assets" USING "btree" ("user_id");


--
-- Name: idx_brand_assets_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_assets_workspace" ON "public"."brand_assets" USING "btree" ("workspace_id");


--
-- Name: idx_brand_assets_workspace_source_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_assets_workspace_source_url" ON "public"."brand_assets" USING "btree" ("workspace_id", "source_url") WHERE ("source_url" IS NOT NULL);


--
-- Name: idx_brand_kits_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_kits_session" ON "public"."brand_kits" USING "btree" ("onboarding_session_id");


--
-- Name: idx_brand_kits_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_kits_user" ON "public"."brand_kits" USING "btree" ("user_id");


--
-- Name: idx_brand_kits_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_kits_workspace" ON "public"."brand_kits" USING "btree" ("workspace_id");


--
-- Name: idx_brand_sources_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_sources_workspace" ON "public"."brand_sources" USING "btree" ("workspace_id");


--
-- Name: idx_campaign_posts_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_campaign_posts_campaign" ON "public"."campaign_posts" USING "btree" ("campaign_id");


--
-- Name: idx_campaign_posts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_campaign_posts_scheduled" ON "public"."campaign_posts" USING "btree" ("scheduled_at");


--
-- Name: idx_campaign_posts_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_campaign_posts_session" ON "public"."campaign_posts" USING "btree" ("onboarding_session_id");


--
-- Name: idx_campaign_posts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_campaign_posts_user" ON "public"."campaign_posts" USING "btree" ("user_id");


--
-- Name: idx_campaign_posts_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_campaign_posts_workspace" ON "public"."campaign_posts" USING "btree" ("workspace_id");


--
-- Name: idx_caption_mood; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_caption_mood" ON "public"."caption_examples" USING "btree" ("content_mood");


--
-- Name: idx_caption_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_caption_platform" ON "public"."caption_examples" USING "btree" ("platform");


--
-- Name: idx_caption_style; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_caption_style" ON "public"."caption_examples" USING "btree" ("style_tag");


--
-- Name: idx_content_preferences_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_content_preferences_session" ON "public"."content_preferences" USING "btree" ("onboarding_session_id");


--
-- Name: idx_content_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_content_preferences_user" ON "public"."content_preferences" USING "btree" ("user_id");


--
-- Name: idx_content_preferences_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_content_preferences_workspace" ON "public"."content_preferences" USING "btree" ("workspace_id");


--
-- Name: idx_content_projects_workspace_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_content_projects_workspace_stage" ON "public"."content_projects" USING "btree" ("workspace_id", "stage", "updated_at" DESC);


--
-- Name: idx_credit_transactions_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_credit_transactions_user_created" ON "public"."credit_transactions" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_designs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_designs_session" ON "public"."designs" USING "btree" ("onboarding_session_id");


--
-- Name: idx_designs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_designs_user" ON "public"."designs" USING "btree" ("user_id");


--
-- Name: idx_designs_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_designs_workspace" ON "public"."designs" USING "btree" ("workspace_id");


--
-- Name: idx_marketing_campaigns_cover_image; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_marketing_campaigns_cover_image" ON "public"."marketing_campaigns" USING "btree" ("cover_image_url");


--
-- Name: idx_marketing_campaigns_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_marketing_campaigns_session" ON "public"."marketing_campaigns" USING "btree" ("onboarding_session_id");


--
-- Name: idx_marketing_campaigns_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_marketing_campaigns_user" ON "public"."marketing_campaigns" USING "btree" ("user_id");


--
-- Name: idx_marketing_campaigns_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_marketing_campaigns_workspace" ON "public"."marketing_campaigns" USING "btree" ("workspace_id");


--
-- Name: idx_social_connections_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_social_connections_session" ON "public"."social_connections" USING "btree" ("onboarding_session_id");


--
-- Name: idx_social_connections_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_social_connections_workspace" ON "public"."social_connections" USING "btree" ("workspace_id");


--
-- Name: idx_user_plans_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_user_plans_user" ON "public"."user_plans" USING "btree" ("user_id");


--
-- Name: idx_workspace_topic_dismissals_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workspace_topic_dismissals_workspace" ON "public"."workspace_topic_idea_dismissals" USING "btree" ("workspace_id");


--
-- Name: idx_workspace_topic_ideas_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_workspace_topic_ideas_workspace_created" ON "public"."workspace_topic_ideas" USING "btree" ("workspace_id", "created_at" DESC);


--
-- Name: kol_applications_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kol_applications_campaign_idx" ON "public"."kol_campaign_applications" USING "btree" ("campaign_id");


--
-- Name: kol_applications_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "kol_applications_unique" ON "public"."kol_campaign_applications" USING "btree" ("campaign_id", "egg_creator_id");


--
-- Name: kol_applications_workspace_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "kol_applications_workspace_idx" ON "public"."kol_campaign_applications" USING "btree" ("workspace_id");


--
-- Name: marketing_campaigns_workspace_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "marketing_campaigns_workspace_source_unique" ON "public"."marketing_campaigns" USING "btree" ("workspace_id", "source_key") WHERE ("workspace_id" IS NOT NULL);


--
-- Name: project_briefs_creator_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_briefs_creator_idx" ON "public"."project_briefs" USING "btree" ("creator_username");


--
-- Name: project_briefs_workspace_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "project_briefs_workspace_idx" ON "public"."project_briefs" USING "btree" ("workspace_id");


--
-- Name: reply_settings_user_inbox_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "reply_settings_user_inbox_key" ON "public"."reply_settings" USING "btree" ("user_id", "inbox_type");


--
-- Name: settings_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "settings_user_id_key" ON "public"."settings" USING "btree" ("user_id");


--
-- Name: social_connections_workspace_platform_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "social_connections_workspace_platform_unique" ON "public"."social_connections" USING "btree" ("workspace_id", "platform") WHERE ("workspace_id" IS NOT NULL);


--
-- Name: workspace_notifications_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workspace_notifications_read_idx" ON "public"."workspace_notifications" USING "btree" ("workspace_id", "is_read");


--
-- Name: workspace_notifications_workspace_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "workspace_notifications_workspace_idx" ON "public"."workspace_notifications" USING "btree" ("workspace_id");


--
-- Name: workspace_profiles_slug_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workspace_profiles_slug_unique" ON "public"."workspace_profiles" USING "btree" ("lower"("slug")) WHERE ("slug" IS NOT NULL);


--
-- Name: workspace_topic_ideas_workspace_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "workspace_topic_ideas_workspace_source_unique" ON "public"."workspace_topic_ideas" USING "btree" ("workspace_id", "source_url");


--
-- Name: brand_assets brand_assets_brand_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_brand_kit_id_fkey" FOREIGN KEY ("brand_kit_id") REFERENCES "public"."brand_kits"("id") ON DELETE CASCADE;


--
-- Name: brand_assets brand_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: brand_assets brand_assets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: brand_kits brand_kits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: brand_kits brand_kits_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_kits"
    ADD CONSTRAINT "brand_kits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: brand_perks brand_perks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_perks"
    ADD CONSTRAINT "brand_perks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: brand_profiles brand_profiles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_profiles"
    ADD CONSTRAINT "brand_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: brand_sources brand_sources_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_sources"
    ADD CONSTRAINT "brand_sources_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: brand_voices brand_voices_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_voices"
    ADD CONSTRAINT "brand_voices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: campaign_posts campaign_posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_posts"
    ADD CONSTRAINT "campaign_posts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;


--
-- Name: campaign_posts campaign_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_posts"
    ADD CONSTRAINT "campaign_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: campaign_posts campaign_posts_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."campaign_posts"
    ADD CONSTRAINT "campaign_posts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: clip_comments clip_comments_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_comments"
    ADD CONSTRAINT "clip_comments_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE CASCADE;


--
-- Name: clip_comments clip_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_comments"
    ADD CONSTRAINT "clip_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: clip_reactions clip_reactions_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reactions"
    ADD CONSTRAINT "clip_reactions_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE CASCADE;


--
-- Name: clip_reactions clip_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reactions"
    ADD CONSTRAINT "clip_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: clip_reports clip_reports_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reports"
    ADD CONSTRAINT "clip_reports_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "public"."clips"("id") ON DELETE CASCADE;


--
-- Name: clip_reports clip_reports_reported_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reports"
    ADD CONSTRAINT "clip_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: clip_reports clip_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clip_reports"
    ADD CONSTRAINT "clip_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: clips clips_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clips"
    ADD CONSTRAINT "clips_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;


--
-- Name: clips clips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."clips"
    ADD CONSTRAINT "clips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: content_preferences content_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_preferences"
    ADD CONSTRAINT "content_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: content_preferences content_preferences_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_preferences"
    ADD CONSTRAINT "content_preferences_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: content_projects content_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: content_projects content_projects_prompt_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "public"."workspace_prompt_versions"("id") ON DELETE SET NULL;


--
-- Name: content_projects content_projects_topic_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_topic_idea_id_fkey" FOREIGN KEY ("topic_idea_id") REFERENCES "public"."workspace_topic_ideas"("id") ON DELETE SET NULL;


--
-- Name: content_projects content_projects_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: content_projects content_projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."content_projects"
    ADD CONSTRAINT "content_projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: creator_usage_ledger creator_usage_ledger_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."creator_usage_ledger"
    ADD CONSTRAINT "creator_usage_ledger_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."creator_applications"("id") ON DELETE CASCADE;


--
-- Name: credit_transactions credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: designs designs_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."campaign_posts"("id") ON DELETE SET NULL;


--
-- Name: designs designs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: designs designs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: doc_folders doc_folders_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."doc_folders"
    ADD CONSTRAINT "doc_folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: docs docs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: docs docs_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."doc_folders"("id") ON DELETE SET NULL;


--
-- Name: docs docs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."docs"
    ADD CONSTRAINT "docs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: expenses expenses_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");


--
-- Name: financial_reports financial_reports_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");


--
-- Name: invitations invitations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: kol_campaign_applications kol_campaign_applications_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kol_campaign_applications"
    ADD CONSTRAINT "kol_campaign_applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;


--
-- Name: kol_campaign_applications kol_campaign_applications_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."kol_campaign_applications"
    ADD CONSTRAINT "kol_campaign_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: marketing_campaigns marketing_campaigns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: marketing_campaigns marketing_campaigns_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: perk_claims perk_claims_perk_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."perk_claims"
    ADD CONSTRAINT "perk_claims_perk_id_fkey" FOREIGN KEY ("perk_id") REFERENCES "public"."brand_perks"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: project_briefs project_briefs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."project_briefs"
    ADD CONSTRAINT "project_briefs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE SET NULL;


--
-- Name: project_briefs project_briefs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."project_briefs"
    ADD CONSTRAINT "project_briefs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: projects projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");


--
-- Name: reply_threads reply_threads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reply_threads"
    ADD CONSTRAINT "reply_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: reply_threads reply_threads_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."reply_threads"
    ADD CONSTRAINT "reply_threads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");


--
-- Name: room_members room_members_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;


--
-- Name: room_members room_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."room_members"
    ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: rooms rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");


--
-- Name: social_connections social_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: social_connections social_connections_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."social_connections"
    ADD CONSTRAINT "social_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE SET NULL;


--
-- Name: user_credits user_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;


--
-- Name: user_plans user_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."user_plans"
    ADD CONSTRAINT "user_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: workspace_invitations workspace_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");


--
-- Name: workspace_invitations workspace_invitations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");


--
-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_notifications workspace_notifications_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_notifications"
    ADD CONSTRAINT "workspace_notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_profiles workspace_profiles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_profiles"
    ADD CONSTRAINT "workspace_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_prompt_versions workspace_prompt_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_prompt_versions"
    ADD CONSTRAINT "workspace_prompt_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: workspace_prompt_versions workspace_prompt_versions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_prompt_versions"
    ADD CONSTRAINT "workspace_prompt_versions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_topic_idea_dismissals workspace_topic_idea_dismissals_dismissed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_idea_dismissals"
    ADD CONSTRAINT "workspace_topic_idea_dismissals_dismissed_by_fkey" FOREIGN KEY ("dismissed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: workspace_topic_idea_dismissals workspace_topic_idea_dismissals_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_idea_dismissals"
    ADD CONSTRAINT "workspace_topic_idea_dismissals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspace_topic_ideas workspace_topic_ideas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_ideas"
    ADD CONSTRAINT "workspace_topic_ideas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: workspace_topic_ideas workspace_topic_ideas_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspace_topic_ideas"
    ADD CONSTRAINT "workspace_topic_ideas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;


--
-- Name: workspaces workspaces_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");


--
-- Name: doc_folders Allow public doc folder delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public doc folder delete" ON "public"."doc_folders" FOR DELETE USING (true);


--
-- Name: doc_folders Allow public doc folder insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public doc folder insert" ON "public"."doc_folders" FOR INSERT WITH CHECK (true);


--
-- Name: doc_folders Allow public doc folder read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public doc folder read" ON "public"."doc_folders" FOR SELECT USING (true);


--
-- Name: doc_folders Allow public doc folder update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public doc folder update" ON "public"."doc_folders" FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: campaign_intakes Anyone can insert campaign intakes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert campaign intakes" ON "public"."campaign_intakes" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: creator_applications Anyone can insert creator applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert creator applications" ON "public"."creator_applications" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: content_projects Owner and admin create content projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner and admin create content projects" ON "public"."content_projects" FOR INSERT WITH CHECK ("public"."can_manage_content_studio"("workspace_id"));


--
-- Name: content_projects Owner and admin delete content projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner and admin delete content projects" ON "public"."content_projects" FOR DELETE USING ("public"."can_manage_content_studio"("workspace_id"));


--
-- Name: content_projects Owner and admin read content projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner and admin read content projects" ON "public"."content_projects" FOR SELECT USING ("public"."can_manage_content_studio"("workspace_id"));


--
-- Name: content_projects Owner and admin update content projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner and admin update content projects" ON "public"."content_projects" FOR UPDATE USING ("public"."can_manage_content_studio"("workspace_id")) WITH CHECK ("public"."can_manage_content_studio"("workspace_id"));


--
-- Name: clips Public clips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public clips" ON "public"."clips" USING (true);


--
-- Name: profiles Public profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles" ON "public"."profiles" USING (true);


--
-- Name: room_members Public room_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public room_members" ON "public"."room_members" USING (true);


--
-- Name: rooms Public rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public rooms" ON "public"."rooms" USING (true);


--
-- Name: user_credits Users can view own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credits" ON "public"."user_credits" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: user_plans Users can view own plan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own plan" ON "public"."user_plans" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: credit_transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON "public"."credit_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: workspace_members Users can view own workspace memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own workspace memberships" ON "public"."workspace_members" FOR SELECT USING (("user_id" = "auth"."uid"()));


--
-- Name: brand_assets Users own their brand_assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their brand_assets" ON "public"."brand_assets" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: brand_kits Users own their brand_kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their brand_kits" ON "public"."brand_kits" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: campaign_posts Users own their campaign_posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their campaign_posts" ON "public"."campaign_posts" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: content_preferences Users own their content_preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their content_preferences" ON "public"."content_preferences" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: designs Users own their designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their designs" ON "public"."designs" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: marketing_campaigns Users own their marketing_campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their marketing_campaigns" ON "public"."marketing_campaigns" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: social_connections Users own their social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their social_connections" ON "public"."social_connections" USING (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL))) WITH CHECK (((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR ("onboarding_session_id" IS NOT NULL)));


--
-- Name: workspaces Users own their workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users own their workspaces" ON "public"."workspaces" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));


--
-- Name: brand_assets Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."brand_assets" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: brand_kits Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."brand_kits" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: campaign_posts Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."campaign_posts" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: content_preferences Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."content_preferences" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: designs Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."designs" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: marketing_campaigns Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."marketing_campaigns" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: social_connections Workspace editors can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete" ON "public"."social_connections" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: workspace_profiles Workspace editors can delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can delete profiles" ON "public"."workspace_profiles" FOR DELETE USING ("public"."can_edit_workspace"("workspace_id"));


--
-- Name: brand_assets Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."brand_assets" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: brand_kits Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."brand_kits" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: campaign_posts Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."campaign_posts" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: content_preferences Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."content_preferences" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: designs Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."designs" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: marketing_campaigns Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."marketing_campaigns" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: social_connections Workspace editors can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert" ON "public"."social_connections" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: workspace_profiles Workspace editors can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can insert profiles" ON "public"."workspace_profiles" FOR INSERT WITH CHECK ("public"."can_edit_workspace"("workspace_id"));


--
-- Name: brand_assets Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."brand_assets" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: brand_kits Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."brand_kits" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: campaign_posts Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."campaign_posts" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: content_preferences Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."content_preferences" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: designs Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."designs" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: marketing_campaigns Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."marketing_campaigns" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: social_connections Workspace editors can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update" ON "public"."social_connections" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id"))) WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."can_edit_workspace"("workspace_id")));


--
-- Name: workspace_profiles Workspace editors can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace editors can update profiles" ON "public"."workspace_profiles" FOR UPDATE USING ("public"."can_edit_workspace"("workspace_id")) WITH CHECK ("public"."can_edit_workspace"("workspace_id"));


--
-- Name: brand_assets Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."brand_assets" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: brand_kits Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."brand_kits" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: campaign_posts Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."campaign_posts" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: content_preferences Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."content_preferences" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: designs Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."designs" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: marketing_campaigns Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."marketing_campaigns" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: social_connections Workspace members can read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read" ON "public"."social_connections" FOR SELECT USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));


--
-- Name: workspace_profiles Workspace members can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can read profiles" ON "public"."workspace_profiles" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));


--
-- Name: workspace_prompt_versions Workspace owners manage prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace owners manage prompts" ON "public"."workspace_prompt_versions" USING ((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_prompt_versions"."workspace_id") AND ("w"."owner_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_prompt_versions"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))));


--
-- Name: brand_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_kits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_kits" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_profiles brand_profiles_workspace_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "brand_profiles_workspace_owner_select" ON "public"."brand_profiles" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "brand_profiles"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "brand_profiles"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()) AND ("wm"."status" = 'active'::"text"))))));


--
-- Name: brand_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_sources" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_sources brand_sources_workspace_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "brand_sources_workspace_owner_select" ON "public"."brand_sources" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "brand_sources"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "brand_sources"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()) AND ("wm"."status" = 'active'::"text"))))));


--
-- Name: brand_voices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_voices" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_voices brand_voices_workspace_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "brand_voices_workspace_owner_select" ON "public"."brand_voices" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "brand_voices"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "brand_voices"."workspace_id") AND ("wm"."user_id" = "auth"."uid"()) AND ("wm"."status" = 'active'::"text"))))));


--
-- Name: campaign_intakes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."campaign_intakes" ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."campaign_posts" ENABLE ROW LEVEL SECURITY;

--
-- Name: caption_examples; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."caption_examples" ENABLE ROW LEVEL SECURITY;

--
-- Name: clip_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."clip_comments" ENABLE ROW LEVEL SECURITY;

--
-- Name: clip_comments clip_comments_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_comments_delete_own" ON "public"."clip_comments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: clip_comments clip_comments_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_comments_insert_own" ON "public"."clip_comments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: clip_comments clip_comments_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_comments_select_authenticated" ON "public"."clip_comments" FOR SELECT TO "authenticated" USING (true);


--
-- Name: clip_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."clip_reactions" ENABLE ROW LEVEL SECURITY;

--
-- Name: clip_reactions clip_reactions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reactions_delete_own" ON "public"."clip_reactions" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: clip_reactions clip_reactions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reactions_insert_own" ON "public"."clip_reactions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: clip_reactions clip_reactions_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reactions_select_authenticated" ON "public"."clip_reactions" FOR SELECT TO "authenticated" USING (true);


--
-- Name: clip_reactions clip_reactions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reactions_update_own" ON "public"."clip_reactions" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: clip_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."clip_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: clip_reports clip_reports_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reports_insert_own" ON "public"."clip_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));


--
-- Name: clip_reports clip_reports_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "clip_reports_select_own" ON "public"."clip_reports" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "reporter_id"));


--
-- Name: clips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."clips" ENABLE ROW LEVEL SECURITY;

--
-- Name: content_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."content_preferences" ENABLE ROW LEVEL SECURITY;

--
-- Name: content_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."content_projects" ENABLE ROW LEVEL SECURITY;

--
-- Name: content_strategy_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."content_strategy_library" ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."creator_applications" ENABLE ROW LEVEL SECURITY;

--
-- Name: creator_usage_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."creator_usage_ledger" ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;

--
-- Name: designs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."designs" ENABLE ROW LEVEL SECURITY;

--
-- Name: doc_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."doc_folders" ENABLE ROW LEVEL SECURITY;

--
-- Name: docs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."docs" ENABLE ROW LEVEL SECURITY;

--
-- Name: docs docs_workspace_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "docs_workspace_members_delete" ON "public"."docs" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: docs docs_workspace_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "docs_workspace_members_insert" ON "public"."docs" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: docs docs_workspace_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "docs_workspace_members_select" ON "public"."docs" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: docs docs_workspace_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "docs_workspace_members_update" ON "public"."docs" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text"))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_workspace_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expenses_workspace_members_delete" ON "public"."expenses" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: expenses expenses_workspace_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expenses_workspace_members_insert" ON "public"."expenses" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: expenses expenses_workspace_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expenses_workspace_members_select" ON "public"."expenses" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: expenses expenses_workspace_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "expenses_workspace_members_update" ON "public"."expenses" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text"))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: financial_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."financial_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations invitations_delete_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations_delete_admins" ON "public"."invitations" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: invitations invitations_insert_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations_insert_admins" ON "public"."invitations" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: invitations invitations_select_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations_select_admins" ON "public"."invitations" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: invitations invitations_update_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "invitations_update_admins" ON "public"."invitations" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: marketing_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: profiles profiles_select_self_or_shared_room; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_select_self_or_shared_room" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."shares_room_with"("id")));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_workspace_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "projects_workspace_members_delete" ON "public"."projects" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: projects projects_workspace_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "projects_workspace_members_insert" ON "public"."projects" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: projects projects_workspace_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "projects_workspace_members_select" ON "public"."projects" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: projects projects_workspace_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "projects_workspace_members_update" ON "public"."projects" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text"))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: reply_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reply_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: reply_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."reply_threads" ENABLE ROW LEVEL SECURITY;

--
-- Name: reply_threads reply_threads_workspace_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reply_threads_workspace_members_delete" ON "public"."reply_threads" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: reply_threads reply_threads_workspace_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reply_threads_workspace_members_insert" ON "public"."reply_threads" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: reply_threads reply_threads_workspace_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reply_threads_workspace_members_select" ON "public"."reply_threads" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: reply_threads reply_threads_workspace_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reply_threads_workspace_members_update" ON "public"."reply_threads" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text"))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: room_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."room_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: room_members room_members_delete_self_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "room_members_delete_self_or_owner" ON "public"."room_members" FOR DELETE TO "authenticated";


--
-- Name: room_members room_members_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "room_members_insert_self" ON "public"."room_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));


--
-- Name: room_members room_members_select_same_room; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "room_members_select_same_room" ON "public"."room_members" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));


--
-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;

--
-- Name: rooms rooms_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rooms_insert_own" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: rooms rooms_select_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rooms_select_member" ON "public"."rooms" FOR SELECT TO "authenticated" USING ("public"."is_room_member"("id"));


--
-- Name: rooms rooms_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "rooms_update_owner" ON "public"."rooms" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));


--
-- Name: workspace_invitations service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role full access" ON "public"."workspace_invitations" USING (("auth"."role"() = 'service_role'::"text"));


--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: social_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."social_connections" ENABLE ROW LEVEL SECURITY;

--
-- Name: docs soon_core_public_delete_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_docs" ON "public"."docs" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: expenses soon_core_public_delete_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_expenses" ON "public"."expenses" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: financial_reports soon_core_public_delete_financial_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_financial_reports" ON "public"."financial_reports" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: projects soon_core_public_delete_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_projects" ON "public"."projects" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: reply_settings soon_core_public_delete_reply_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_reply_settings" ON "public"."reply_settings" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: reply_threads soon_core_public_delete_reply_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_reply_threads" ON "public"."reply_threads" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: workspaces soon_core_public_delete_workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_delete_workspaces" ON "public"."workspaces" FOR DELETE TO "authenticated", "anon" USING (true);


--
-- Name: docs soon_core_public_insert_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_docs" ON "public"."docs" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: expenses soon_core_public_insert_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_expenses" ON "public"."expenses" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: financial_reports soon_core_public_insert_financial_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_financial_reports" ON "public"."financial_reports" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: projects soon_core_public_insert_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_projects" ON "public"."projects" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: reply_settings soon_core_public_insert_reply_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_reply_settings" ON "public"."reply_settings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: reply_threads soon_core_public_insert_reply_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_reply_threads" ON "public"."reply_threads" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: settings soon_core_public_insert_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_settings" ON "public"."settings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: workspaces soon_core_public_insert_workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_insert_workspaces" ON "public"."workspaces" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);


--
-- Name: docs soon_core_public_select_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_docs" ON "public"."docs" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: expenses soon_core_public_select_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_expenses" ON "public"."expenses" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: financial_reports soon_core_public_select_financial_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_financial_reports" ON "public"."financial_reports" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: projects soon_core_public_select_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_projects" ON "public"."projects" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: reply_settings soon_core_public_select_reply_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_reply_settings" ON "public"."reply_settings" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: reply_threads soon_core_public_select_reply_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_reply_threads" ON "public"."reply_threads" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: settings soon_core_public_select_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_settings" ON "public"."settings" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: workspaces soon_core_public_select_workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_select_workspaces" ON "public"."workspaces" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: docs soon_core_public_update_docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_docs" ON "public"."docs" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: expenses soon_core_public_update_expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_expenses" ON "public"."expenses" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: financial_reports soon_core_public_update_financial_reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_financial_reports" ON "public"."financial_reports" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: projects soon_core_public_update_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_projects" ON "public"."projects" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: reply_settings soon_core_public_update_reply_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_reply_settings" ON "public"."reply_settings" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: reply_threads soon_core_public_update_reply_threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_reply_threads" ON "public"."reply_threads" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: settings soon_core_public_update_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_settings" ON "public"."settings" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: workspaces soon_core_public_update_workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "soon_core_public_update_workspaces" ON "public"."workspaces" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);


--
-- Name: strategy_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."strategy_library" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_credits" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback user_feedback_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user_feedback_insert_own" ON "public"."user_feedback" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: user_feedback user_feedback_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user_feedback_select_own" ON "public"."user_feedback" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));


--
-- Name: user_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."user_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_invitations workspace admins can insert invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace admins can insert invitations" ON "public"."workspace_invitations" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: caption_examples workspace members can insert caption examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace members can insert caption examples" ON "public"."caption_examples" FOR INSERT WITH CHECK (true);


--
-- Name: caption_examples workspace members can read caption examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace members can read caption examples" ON "public"."caption_examples" FOR SELECT USING (true);


--
-- Name: workspace_invitations workspace members can view invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace members can view invitations" ON "public"."workspace_invitations" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text")))));


--
-- Name: workspace_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_invitations" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_members workspace_members_delete_owners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_members_delete_owners" ON "public"."workspace_members" FOR DELETE USING (("workspace_id" IN ( SELECT "workspace_members_1"."workspace_id"
   FROM "public"."workspace_members" "workspace_members_1"
  WHERE (("workspace_members_1"."user_id" = "auth"."uid"()) AND ("workspace_members_1"."status" = 'active'::"text") AND ("workspace_members_1"."role" = 'owner'::"text")))));


--
-- Name: workspace_members workspace_members_insert_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_members_insert_admins" ON "public"."workspace_members" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND (("invited_by" = "auth"."uid"()) OR ("workspace_id" IN ( SELECT "workspace_members_1"."workspace_id"
   FROM "public"."workspace_members" "workspace_members_1"
  WHERE (("workspace_members_1"."user_id" = "auth"."uid"()) AND ("workspace_members_1"."status" = 'active'::"text") AND ("workspace_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))))));


--
-- Name: workspace_members workspace_members_select_team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_members_select_team" ON "public"."workspace_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("workspace_id" IN ( SELECT "workspace_members_1"."workspace_id"
   FROM "public"."workspace_members" "workspace_members_1"
  WHERE (("workspace_members_1"."user_id" = "auth"."uid"()) AND ("workspace_members_1"."status" = 'active'::"text"))))));


--
-- Name: workspace_members workspace_members_update_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_members_update_admins" ON "public"."workspace_members" FOR UPDATE USING (("workspace_id" IN ( SELECT "workspace_members_1"."workspace_id"
   FROM "public"."workspace_members" "workspace_members_1"
  WHERE (("workspace_members_1"."user_id" = "auth"."uid"()) AND ("workspace_members_1"."status" = 'active'::"text") AND ("workspace_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("workspace_id" IN ( SELECT "workspace_members_1"."workspace_id"
   FROM "public"."workspace_members" "workspace_members_1"
  WHERE (("workspace_members_1"."user_id" = "auth"."uid"()) AND ("workspace_members_1"."status" = 'active'::"text") AND ("workspace_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- Name: workspace_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_prompt_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_prompt_versions" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_topic_idea_dismissals workspace_topic_dismissals_member_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_topic_dismissals_member_select" ON "public"."workspace_topic_idea_dismissals" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_topic_idea_dismissals"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "workspace_topic_idea_dismissals"."workspace_id") AND ("wm"."status" = 'active'::"text") AND (("wm"."user_id" = "auth"."uid"()) OR ("lower"("wm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))))));


--
-- Name: workspace_topic_idea_dismissals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_topic_idea_dismissals" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_topic_ideas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspace_topic_ideas" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_topic_ideas workspace_topic_ideas_member_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_topic_ideas_member_delete" ON "public"."workspace_topic_ideas" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_topic_ideas"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "workspace_topic_ideas"."workspace_id") AND ("wm"."status" = 'active'::"text") AND ("wm"."user_id" = "auth"."uid"()) AND ("wm"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));


--
-- Name: workspace_topic_ideas workspace_topic_ideas_member_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_topic_ideas_member_insert" ON "public"."workspace_topic_ideas" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_topic_ideas"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "workspace_topic_ideas"."workspace_id") AND ("wm"."status" = 'active'::"text") AND (("wm"."user_id" = "auth"."uid"()) OR ("lower"("wm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))))));


--
-- Name: workspace_topic_ideas workspace_topic_ideas_member_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_topic_ideas_member_select" ON "public"."workspace_topic_ideas" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_topic_ideas"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "workspace_topic_ideas"."workspace_id") AND ("wm"."status" = 'active'::"text") AND (("wm"."user_id" = "auth"."uid"()) OR ("lower"("wm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))))));


--
-- Name: workspace_topic_ideas workspace_topic_ideas_member_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspace_topic_ideas_member_update" ON "public"."workspace_topic_ideas" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."workspaces" "w"
  WHERE (("w"."id" = "workspace_topic_ideas"."workspace_id") AND ("w"."owner_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."workspace_id" = "workspace_topic_ideas"."workspace_id") AND ("wm"."status" = 'active'::"text") AND ("wm"."user_id" = "auth"."uid"()))))));


--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces workspaces_delete_owners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspaces_delete_owners" ON "public"."workspaces" FOR DELETE USING (("id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = 'owner'::"text")))));


--
-- Name: workspaces workspaces_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspaces_insert_authenticated" ON "public"."workspaces" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));


--
-- Name: workspaces workspaces_select_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspaces_select_members" ON "public"."workspaces" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("id" IN ( SELECT "wm"."workspace_id"
   FROM "public"."workspace_members" "wm"
  WHERE (("wm"."user_id" = "auth"."uid"()) AND ("wm"."status" = 'active'::"text"))))));


--
-- Name: workspaces workspaces_update_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "workspaces_update_admins" ON "public"."workspaces" FOR UPDATE USING (("id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."user_id" = "auth"."uid"()) AND ("workspace_members"."status" = 'active'::"text") AND ("workspace_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));


--
-- PostgreSQL database dump complete
--

\unrestrict P6KOvKaubygJc5cSaZfIcLaN9at72pQzRbEru6pywLRCcZpEIq3IlYOtJZ3Qk9R
