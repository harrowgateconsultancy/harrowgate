-- Idempotent appointment and verified-upload schema update for an imported
-- Harrowgate PostgreSQL database. Back up the target database before running.

CREATE TABLE IF NOT EXISTS appointments (
  id serial PRIMARY KEY,
  submission_id integer NOT NULL,
  appointment_number text NOT NULL,
  office text DEFAULT 'client_office' NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'booked' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  notification_status text DEFAULT 'pending' NOT NULL,
  notification_attempts integer DEFAULT 0 NOT NULL,
  notification_last_error text,
  notification_next_attempt_at timestamptz DEFAULT now() NOT NULL,
  notification_sent_at timestamptz
);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS notification_status text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS notification_attempts integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS notification_last_error text,
  ADD COLUMN IF NOT EXISTS notification_next_attempt_at timestamptz DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointments_submission_id_student_submissions_id_fk'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_submission_id_student_submissions_id_fk
      FOREIGN KEY (submission_id)
      REFERENCES student_submissions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_submission_unique
  ON appointments (submission_id);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_number_unique
  ON appointments (appointment_number);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_scheduled_at_unique
  ON appointments (scheduled_at);

CREATE TABLE IF NOT EXISTS storage_upload_reservations (
  id serial PRIMARY KEY,
  object_path text NOT NULL UNIQUE,
  student_user_id text NOT NULL,
  uploaded_at timestamptz,
  claimed_submission_id integer,
  claimed_document_type text,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE student_documents
  ADD COLUMN IF NOT EXISTS upload_verified boolean DEFAULT false NOT NULL;

-- Existing NAS uploads were already present before upload reservations existed.
UPDATE student_documents
SET upload_verified = true
WHERE upload_verified = false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'storage_upload_reservations_claimed_submission_id_student_submissions_id_fk'
  ) THEN
    ALTER TABLE storage_upload_reservations
      ADD CONSTRAINT storage_upload_reservations_claimed_submission_id_student_submissions_id_fk
      FOREIGN KEY (claimed_submission_id)
      REFERENCES student_submissions(id)
      ON DELETE SET NULL;
  END IF;
END $$;
