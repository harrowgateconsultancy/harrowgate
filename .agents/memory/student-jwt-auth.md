---
name: Self-hosted student JWT auth
description: Clerk fully removed; student auth uses HMAC-SHA256 tokens + scrypt passwords; runs with no external services.
---

# Self-hosted Student JWT Auth

## The rule
Student auth uses self-hosted HMAC-SHA256 tokens stored in `localStorage` — no Clerk or external auth service. The `getSecret()` function throws at runtime if neither `STUDENT_JWT_SECRET` nor `ADMIN_PASSWORD` env var is set; there is no insecure fallback.

**Why:** Owner self-hosts on a UGreen NAS. Clerk was removed to eliminate the external dependency entirely.

## How to apply
- `STUDENT_JWT_SECRET` (or `ADMIN_PASSWORD` as fallback) must be in the environment — the server will throw on any token operation if missing.
- Frontend auth helpers live in `artifacts/harrowgate/src/lib/studentAuth.ts`. `authHeaders()` is synchronous (no `await` needed) — different from the old Clerk pattern.
- The `student_users` table is auto-created at startup. The existing `clerkUserId` column in `student_submissions` now stores the student UUID from `student_users`.
- Existing Clerk-registered students need a migration to create `student_users` rows (no built-in migration yet).

## Sign-in provenance

The student account records its last successful sign-in method so admin staff can distinguish the portal email from the application contact email and see whether the student used a Harrowgate password account, Google, or Apple.

**Why:** A student can submit a different contact email from the email used to access the portal, and a linked OAuth account can also have a password login.

**How to apply:** Update the recorded provider only after successful authentication; when displaying it to admins, prefer the last recorded method and fall back to the account's available credential/link for older accounts.
