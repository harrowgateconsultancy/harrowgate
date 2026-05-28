---
name: Google Drive + Sheets integration
description: How Drive/Sheets sync is wired into the HARROWGATE api-server
---

## Setup
- Service Account JSON → `GOOGLE_SERVICE_ACCOUNT_JSON` secret (full JSON file contents)
- Drive root folder ID → `GOOGLE_DRIVE_ROOT_FOLDER_ID` (accepts full URL or bare ID — `extractId()` strips it)
- Spreadsheet ID → `GOOGLE_SHEETS_ID` (same, full URL or bare ID)
- Service account email: `harrowgate@drive-api-497715.iam.gserviceaccount.com`
- Both Drive folder and Sheet must be shared with the service account email as **Editor**

## Key file
`artifacts/api-server/src/lib/googleIntegration.ts` — all Drive and Sheets logic

## What syncs automatically
- New student submission → creates `[id] Name` Drive folder + Sheets row
- Document upload → uploads file to student's Drive folder (replaces on re-upload)
- Status change → updates Sheets row
- Admin delete → removes Sheets row
- Manual bulk sync → `POST /api/admin/google-sync` (also wired to button in Submissions.tsx)

**Why:** Silently fails (fire-and-forget) — never blocks the main API response.
