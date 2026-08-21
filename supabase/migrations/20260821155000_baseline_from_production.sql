-- Baseline table definitions recovered from the production public schema on 2026-08-21.
-- The complete schema, including constraints, indexes, functions, policies, and triggers, is in supabase/schema_snapshot.sql.

CREATE TABLE IF NOT EXISTS "public"."brand_assets" (
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

CREATE TABLE IF NOT EXISTS "public"."brand_kits" (
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

CREATE TABLE IF NOT EXISTS "public"."brand_perks" (
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

CREATE TABLE IF NOT EXISTS "public"."brand_profiles" (
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

CREATE TABLE IF NOT EXISTS "public"."brand_sources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text" DEFAULT 'website'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "last_scanned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brand_sources_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scanning'::"text", 'done'::"text", 'error'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."brand_voices" (
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

CREATE TABLE IF NOT EXISTS "public"."campaign_intakes" (
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

CREATE TABLE IF NOT EXISTS "public"."campaign_posts" (
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

CREATE TABLE IF NOT EXISTS "public"."caption_examples" (
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

CREATE TABLE IF NOT EXISTS "public"."clip_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."clip_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."clip_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "clip_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid",
    "reason" "text" DEFAULT 'inappropriate'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."clips" (
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

CREATE TABLE IF NOT EXISTS "public"."content_preferences" (
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

CREATE TABLE IF NOT EXISTS "public"."content_projects" (
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

CREATE TABLE IF NOT EXISTS "public"."content_strategy_library" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."creator_applications" (
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

CREATE TABLE IF NOT EXISTS "public"."creator_usage_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "tool_slug" "text" DEFAULT ''::"text" NOT NULL,
    "credits_used" integer DEFAULT 0 NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
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

CREATE TABLE IF NOT EXISTS "public"."designs" (
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

CREATE TABLE IF NOT EXISTS "public"."doc_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "workspace_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."docs" (
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

CREATE TABLE IF NOT EXISTS "public"."expenses" (
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

CREATE TABLE IF NOT EXISTS "public"."financial_reports" (
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

CREATE TABLE IF NOT EXISTS "public"."invitations" (
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

CREATE TABLE IF NOT EXISTS "public"."kol_campaign_applications" (
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

CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
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

CREATE TABLE IF NOT EXISTS "public"."perk_claims" (
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

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "country_code" "text",
    "location_label" "text",
    "avatar_url" "text",
    "expo_push_token" "text"
);

CREATE TABLE IF NOT EXISTS "public"."project_briefs" (
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

CREATE TABLE IF NOT EXISTS "public"."projects" (
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

CREATE TABLE IF NOT EXISTS "public"."reply_settings" (
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

CREATE TABLE IF NOT EXISTS "public"."reply_threads" (
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

CREATE TABLE IF NOT EXISTS "public"."room_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "joined_at" timestamp without time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "name" "text"
);

CREATE TABLE IF NOT EXISTS "public"."settings" (
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

CREATE TABLE IF NOT EXISTS "public"."social_connections" (
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

CREATE TABLE IF NOT EXISTS "public"."strategy_library" (
    "id" "text" DEFAULT 'default'::"text" NOT NULL,
    "library" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "balance" integer DEFAULT 0 NOT NULL,
    "total_earned" integer DEFAULT 0 NOT NULL,
    "total_spent" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message" "text" NOT NULL,
    "app_area" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_plans" (
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

CREATE TABLE IF NOT EXISTS "public"."workspace_invitations" (
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

CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
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

CREATE TABLE IF NOT EXISTS "public"."workspace_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);

CREATE TABLE IF NOT EXISTS "public"."workspace_profiles" (
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

CREATE TABLE IF NOT EXISTS "public"."workspace_prompt_versions" (
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

CREATE TABLE IF NOT EXISTS "public"."workspace_topic_idea_dismissals" (
    "workspace_id" "uuid" NOT NULL,
    "idea_id" "text" NOT NULL,
    "dismissed_by" "uuid",
    "dismissed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."workspace_topic_ideas" (
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

CREATE TABLE IF NOT EXISTS "public"."workspaces" (
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
