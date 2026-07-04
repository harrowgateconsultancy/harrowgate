CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"nationality" text NOT NULL,
	"country_of_origin" text,
	"date_of_birth" text,
	"passport_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"target_program" text,
	"target_university" text,
	"application_type" text,
	"form_data" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"extracted_text" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "id995a_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"form_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "id995a_forms_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "immigration_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"course_name" text,
	"university_name" text,
	"course_website" text,
	"letter1" text,
	"letter2" text,
	"letter3" text,
	"letter4" text,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "immigration_letters_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"from_admin" boolean DEFAULT true NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"passport_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"interview_zoom_link" text,
	"interview_date_time" text,
	"uni_interview_link" text,
	"uni_interview_date_time" text,
	"uni_interview_platform" text,
	"additional_docs_requested" boolean DEFAULT false,
	"additional_docs_request_note" text,
	"immigration_ref_number" text,
	"terms_accepted_at" timestamp with time zone,
	"terms_signature_url" text,
	"preferred_level" text,
	"preferred_course" text,
	"preferred_institution" text,
	"shared_email" text,
	"shared_email_password" text,
	"custom_bank_details" jsonb,
	"programme_type" text,
	"agent_code" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"to_address" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"admin_note" text
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"plain_password" text,
	"email" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "task_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by" text DEFAULT 'admin' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"text" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"deadline" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"plain_password" text,
	"company_name" text NOT NULL,
	"business_reg_url" text,
	"business_reg_name" text,
	"contact_name" text NOT NULL,
	"office_address" text NOT NULL,
	"email" text,
	"contact_number" text NOT NULL,
	"whatsapp_available" text DEFAULT 'no' NOT NULL,
	"id_doc_url" text,
	"id_doc_name" text,
	"agent_code" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_username_unique" UNIQUE("username"),
	CONSTRAINT "agents_agent_code_unique" UNIQUE("agent_code")
);
--> statement-breakpoint
ALTER TABLE "id995a_forms" ADD CONSTRAINT "id995a_forms_submission_id_student_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "immigration_letters" ADD CONSTRAINT "immigration_letters_submission_id_student_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_submission_id_student_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_messages" ADD CONSTRAINT "student_messages_submission_id_student_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_outbox" ADD CONSTRAINT "student_outbox_submission_id_student_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE cascade ON UPDATE no action;