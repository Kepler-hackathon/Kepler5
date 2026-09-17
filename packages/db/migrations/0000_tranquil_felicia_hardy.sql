CREATE TYPE "public"."cache_status_t" AS ENUM('generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."chat_scope_t" AS ENUM('slide', 'lecture', 'module', 'course');--> statement-breakpoint
CREATE TYPE "public"."event_type_t" AS ENUM('slide_view', 'quiz_answer', 'quiz_skip', 'remediation_open', 'remediation_feedback', 'widget_publish', 'widget_upvote', 'faq_post', 'faq_reply', 'faq_upvote', 'chat_message', 'practice_complete');--> statement-breakpoint
CREATE TYPE "public"."faq_class_t" AS ENUM('question', 'logistics', 'spam');--> statement-breakpoint
CREATE TYPE "public"."file_kind_t" AS ENUM('deck', 'textbook', 'problem_bank');--> statement-breakpoint
CREATE TYPE "public"."gen_status_t" AS ENUM('pending', 'running', 'done', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."item_status_t" AS ENUM('pending', 'approved', 'discarded', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."item_type_t" AS ENUM('quiz', 'widget');--> statement-breakpoint
CREATE TYPE "public"."job_status_t" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type_t" AS ENUM('remediation_widget', 'remediation_text', 'practice_quiz', 'supplementary', 'chat_title', 'wizard_generate');--> statement-breakpoint
CREATE TYPE "public"."lecture_item_kind_t" AS ENUM('supplementary_slide', 'quiz', 'widget', 'peer_widget');--> statement-breakpoint
CREATE TYPE "public"."module_status_t" AS ENUM('draft', 'processing', 'needs_attention', 'ready_to_review', 'published');--> statement-breakpoint
CREATE TYPE "public"."msg_status_t" AS ENUM('complete', 'stopped', 'error');--> statement-breakpoint
CREATE TYPE "public"."parse_status_t" AS ENUM('pending', 'converting', 'rendering', 'extracting', 'parsed', 'failed', 'unreadable');--> statement-breakpoint
CREATE TYPE "public"."peer_status_t" AS ENUM('collecting', 'in_review', 'changes_requested', 'merged', 'archived');--> statement-breakpoint
CREATE TYPE "public"."remediation_kind_t" AS ENUM('widget', 'text');--> statement-breakpoint
CREATE TYPE "public"."role_t" AS ENUM('student', 'teacher');--> statement-breakpoint
CREATE TYPE "public"."session_status_t" AS ENUM('generating', 'ready', 'in_progress', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tag_level_t" AS ENUM('module', 'lecture', 'slide');--> statement-breakpoint
CREATE TYPE "public"."upload_status_t" AS ENUM('pending', 'uploaded', 'rejected', 'deleted');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"scope" "chat_scope_t",
	"scope_id" uuid,
	"status" "msg_status_t" DEFAULT 'complete' NOT NULL,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"scope" "chat_scope_t" DEFAULT 'course' NOT NULL,
	"scope_id" uuid,
	"origin" text,
	"pending_tool_call_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"term" text,
	"instructor_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_replies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body_md" text NOT NULL,
	"is_instructor" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faq_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body_md" text NOT NULL,
	"tag_module_id" uuid NOT NULL,
	"tag_lecture_id" uuid,
	"tag_slide_id" uuid,
	"tag_level" "tag_level_t" NOT NULL,
	"classification" "faq_class_t" DEFAULT 'question' NOT NULL,
	"classification_meta" jsonb,
	"endorsed" boolean DEFAULT false NOT NULL,
	"endorsed_by" uuid,
	"endorsed_at" timestamp with time zone,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"search" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "faq_threads_title_check" CHECK (char_length("faq_threads"."title") <= 150)
);
--> statement-breakpoint
CREATE TABLE "faq_upvotes" (
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "faq_upvotes_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"uploader_id" uuid,
	"kind" "file_kind_t" NOT NULL,
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text,
	"status" "upload_status_t" DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid NOT NULL,
	"source_slide_id" uuid,
	"type" "item_type_t" NOT NULL,
	"status" "item_status_t" DEFAULT 'approved' NOT NULL,
	"content" jsonb NOT NULL,
	"concept_label" text,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "job_type_t" NOT NULL,
	"status" "job_status_t" DEFAULT 'queued' NOT NULL,
	"requested_by" uuid,
	"idempotency_key" text,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"error_code" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "generation_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"anchor_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"page_from" integer NOT NULL,
	"page_to" integer NOT NULL,
	"section_label" text,
	"text" text NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector(1024) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_anchors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"kind" "file_kind_t" NOT NULL,
	"ingest_status" "gen_status_t" DEFAULT 'pending' NOT NULL,
	"page_count" integer,
	"chunk_count" integer,
	"toc" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_anchors_kind_check" CHECK ("knowledge_anchors"."kind" in ('textbook', 'problem_bank'))
);
--> statement-breakpoint
CREATE TABLE "learning_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "learning_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"type" "event_type_t" NOT NULL,
	"lecture_id" uuid,
	"slide_id" uuid,
	"question_id" uuid,
	"option_key" text,
	"is_correct" boolean,
	"session_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecture_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid NOT NULL,
	"after_slide_id" uuid NOT NULL,
	"kind" "lecture_item_kind_t" NOT NULL,
	"ref_id" uuid NOT NULL,
	"order_in_slot" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecture_processing" (
	"run_id" uuid NOT NULL,
	"lecture_id" uuid NOT NULL,
	"parse_status" "gen_status_t" DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"parse_attempts" integer DEFAULT 0 NOT NULL,
	"gen_status" "gen_status_t" DEFAULT 'pending' NOT NULL,
	"gen_error" text,
	"gen_attempts" integer DEFAULT 0 NOT NULL,
	"items_generated" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lecture_processing_run_id_lecture_id_pk" PRIMARY KEY("run_id","lecture_id")
);
--> statement-breakpoint
CREATE TABLE "lectures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order_index" integer NOT NULL,
	"deck_file_id" uuid,
	"parse_status" "parse_status_t" DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"slide_count" integer,
	"estimated_minutes" integer,
	"media_lost" boolean DEFAULT false NOT NULL,
	"bundle_version" integer DEFAULT 1 NOT NULL,
	"notes_md" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid NOT NULL,
	"name" text NOT NULL,
	"overview_md" text,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schedule_notes" text,
	"order_index" integer,
	"status" "module_status_t" DEFAULT 'draft' NOT NULL,
	"ai_opt_in" boolean DEFAULT false NOT NULL,
	"items_per_lecture" integer DEFAULT 3 NOT NULL,
	"created_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_items_per_lecture_check" CHECK ("modules"."items_per_lecture" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "peer_widget_upvotes" (
	"widget_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peer_widget_upvotes_widget_id_user_id_pk" PRIMARY KEY("widget_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "peer_widgets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"question_id" uuid,
	"question_version" integer,
	"option_key" text,
	"variant" integer,
	"content" jsonb NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tag_module_id" uuid NOT NULL,
	"tag_lecture_id" uuid,
	"tag_slide_id" uuid,
	"tag_level" "tag_level_t" NOT NULL,
	"status" "peer_status_t" DEFAULT 'collecting' NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"entered_review_at" timestamp with time zone,
	"teacher_note" text,
	"archive_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"lecture_item_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peer_widgets_title_check" CHECK (char_length("peer_widgets"."title") <= 80),
	CONSTRAINT "peer_widgets_note_check" CHECK ("peer_widgets"."note" is null or char_length("peer_widgets"."note") <= 280)
);
--> statement-breakpoint
CREATE TABLE "practice_answers" (
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_key" text,
	"is_correct" boolean,
	"skipped" boolean DEFAULT false NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_answers_session_id_question_id_pk" PRIMARY KEY("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"selection" jsonb NOT NULL,
	"status" "session_status_t" DEFAULT 'generating' NOT NULL,
	"job_id" uuid,
	"question_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"current_index" integer DEFAULT 0 NOT NULL,
	"score_correct" integer,
	"score_total" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "processing_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" uuid NOT NULL,
	"execution_arn" text,
	"status" "gen_status_t" DEFAULT 'pending' NOT NULL,
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"only_lecture_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"origin" text NOT NULL,
	"generated_item_id" uuid,
	"lecture_id" uuid NOT NULL,
	"source_slide_id" uuid,
	"prompt_md" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_key" text NOT NULL,
	"explanation_md" text,
	"concept_label" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remediation_cache" (
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"option_key" text NOT NULL,
	"kind" "remediation_kind_t" NOT NULL,
	"variant" integer DEFAULT 1 NOT NULL,
	"status" "cache_status_t" DEFAULT 'generating' NOT NULL,
	"content" jsonb,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"job_id" uuid,
	"error" text,
	"helpful" integer DEFAULT 0 NOT NULL,
	"not_helpful" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "remediation_cache_question_id_question_version_option_key_kind_variant_pk" PRIMARY KEY("question_id","question_version","option_key","kind","variant")
);
--> statement-breakpoint
CREATE TABLE "remediation_feedback" (
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"question_version" integer NOT NULL,
	"option_key" text NOT NULL,
	"kind" "remediation_kind_t" NOT NULL,
	"variant" integer NOT NULL,
	"helpful" boolean NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "remediation_feedback_user_id_question_id_question_version_option_key_kind_variant_pk" PRIMARY KEY("user_id","question_id","question_version","option_key","kind","variant")
);
--> statement-breakpoint
CREATE TABLE "slides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lecture_id" uuid NOT NULL,
	"index" integer,
	"after_slide_id" uuid,
	"sub_index" integer,
	"is_supplementary" boolean DEFAULT false NOT NULL,
	"image_key" text,
	"thumb_key" text,
	"width" integer,
	"height" integer,
	"text" text DEFAULT '' NOT NULL,
	"text_source" text DEFAULT 'none' NOT NULL,
	"notes" text,
	"content" jsonb,
	"source_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "slides_check" CHECK (
    ("slides"."is_supplementary" and "slides"."after_slide_id" is not null and "slides"."sub_index" is not null and "slides"."index" is null)
    or (not "slides"."is_supplementary" and "slides"."index" is not null)
  )
);
--> statement-breakpoint
CREATE TABLE "student_progress" (
	"user_id" uuid NOT NULL,
	"lecture_id" uuid NOT NULL,
	"last_slide_id" uuid,
	"max_slide_index" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_progress_user_id_lecture_id_pk" PRIMARY KEY("user_id","lecture_id")
);
--> statement-breakpoint
CREATE TABLE "supplementary_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slide_id" uuid NOT NULL,
	"job_id" uuid,
	"slide_content" jsonb,
	"widget_content" jsonb,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"merged_slide_id" uuid,
	"merged_item_ids" uuid[],
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"merged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"default_role" "role_t" DEFAULT 'student' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_replies" ADD CONSTRAINT "faq_replies_thread_id_faq_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."faq_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_replies" ADD CONSTRAINT "faq_replies_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_threads" ADD CONSTRAINT "faq_threads_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_threads" ADD CONSTRAINT "faq_threads_tag_module_id_modules_id_fk" FOREIGN KEY ("tag_module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_threads" ADD CONSTRAINT "faq_threads_tag_lecture_id_lectures_id_fk" FOREIGN KEY ("tag_lecture_id") REFERENCES "public"."lectures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_threads" ADD CONSTRAINT "faq_threads_tag_slide_id_slides_id_fk" FOREIGN KEY ("tag_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_upvotes" ADD CONSTRAINT "faq_upvotes_thread_id_faq_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."faq_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_upvotes" ADD CONSTRAINT "faq_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_items" ADD CONSTRAINT "generated_items_source_slide_id_slides_id_fk" FOREIGN KEY ("source_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_chunks" ADD CONSTRAINT "kb_chunks_anchor_id_knowledge_anchors_id_fk" FOREIGN KEY ("anchor_id") REFERENCES "public"."knowledge_anchors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_anchors" ADD CONSTRAINT "knowledge_anchors_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_anchors" ADD CONSTRAINT "knowledge_anchors_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_items" ADD CONSTRAINT "lecture_items_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_items" ADD CONSTRAINT "lecture_items_after_slide_id_slides_id_fk" FOREIGN KEY ("after_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_processing" ADD CONSTRAINT "lecture_processing_run_id_processing_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."processing_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecture_processing" ADD CONSTRAINT "lecture_processing_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectures" ADD CONSTRAINT "lectures_deck_file_id_files_id_fk" FOREIGN KEY ("deck_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widget_upvotes" ADD CONSTRAINT "peer_widget_upvotes_widget_id_peer_widgets_id_fk" FOREIGN KEY ("widget_id") REFERENCES "public"."peer_widgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widget_upvotes" ADD CONSTRAINT "peer_widget_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_tag_module_id_modules_id_fk" FOREIGN KEY ("tag_module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_tag_lecture_id_lectures_id_fk" FOREIGN KEY ("tag_lecture_id") REFERENCES "public"."lectures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_tag_slide_id_slides_id_fk" FOREIGN KEY ("tag_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_lecture_item_id_lecture_items_id_fk" FOREIGN KEY ("lecture_item_id") REFERENCES "public"."lecture_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_widgets" ADD CONSTRAINT "peer_widgets_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_answers" ADD CONSTRAINT "practice_answers_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD CONSTRAINT "processing_runs_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_generated_item_id_generated_items_id_fk" FOREIGN KEY ("generated_item_id") REFERENCES "public"."generated_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_source_slide_id_slides_id_fk" FOREIGN KEY ("source_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_cache" ADD CONSTRAINT "remediation_cache_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_feedback" ADD CONSTRAINT "remediation_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slides" ADD CONSTRAINT "slides_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slides" ADD CONSTRAINT "slides_after_slide_id_slides_id_fk" FOREIGN KEY ("after_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_last_slide_id_slides_id_fk" FOREIGN KEY ("last_slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplementary_drafts" ADD CONSTRAINT "supplementary_drafts_slide_id_slides_id_fk" FOREIGN KEY ("slide_id") REFERENCES "public"."slides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplementary_drafts" ADD CONSTRAINT "supplementary_drafts_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplementary_drafts" ADD CONSTRAINT "supplementary_drafts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_threads_user" ON "chat_threads" USING btree ("user_id","last_message_at");--> statement-breakpoint
CREATE INDEX "faq_threads_search" ON "faq_threads" USING gin ("search");--> statement-breakpoint
CREATE INDEX "faq_threads_tag" ON "faq_threads" USING btree ("tag_module_id","tag_lecture_id","tag_slide_id","created_at");--> statement-breakpoint
CREATE INDEX "files_sha" ON "files" USING btree ("sha256") WHERE "files"."sha256" is not null;--> statement-breakpoint
CREATE INDEX "generation_jobs_user" ON "generation_jobs" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "kb_chunks_module" ON "kb_chunks" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "learning_events_lecture" ON "learning_events" USING btree ("lecture_id","created_at");--> statement-breakpoint
CREATE INDEX "learning_events_slide" ON "learning_events" USING btree ("slide_id") WHERE "learning_events"."slide_id" is not null;--> statement-breakpoint
CREATE INDEX "learning_events_user" ON "learning_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "lecture_items_lecture" ON "lecture_items" USING btree ("lecture_id") WHERE "lecture_items"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "peer_widgets_source" ON "peer_widgets" USING btree ("question_id","question_version","option_key","variant") WHERE "peer_widgets"."status" <> 'archived' and "peer_widgets"."question_id" is not null;--> statement-breakpoint
CREATE INDEX "peer_widgets_status" ON "peer_widgets" USING btree ("status","entered_review_at");--> statement-breakpoint
CREATE INDEX "practice_sessions_user" ON "practice_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "slides_orig" ON "slides" USING btree ("lecture_id","index") WHERE not "slides"."is_supplementary" and "slides"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "slides_supp" ON "slides" USING btree ("after_slide_id","sub_index") WHERE "slides"."is_supplementary" and "slides"."deleted_at" is null;