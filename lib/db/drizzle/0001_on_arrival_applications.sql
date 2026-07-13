CREATE TABLE "on_arrival_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_data" jsonb NOT NULL,
	"passport_path" text,
	"photo_path" text,
	"hotel_path" text,
	"business_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
