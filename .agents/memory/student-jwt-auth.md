---
name: Self-hosted student JWT auth
description: Clerk fully removed; replaced with self-hosted HMAC-SHA256 JWT tokens for student auth — no external services required.
---

# Self-hosted Student JWT Auth

## The rule
Student authentication uses a self-hosted HMAC-SHA256 token stored in `localStorage` — no Clerk or any external auth service. The app runs 100% on a UGreen NAS.

**Why:** Owner wants to self-host on a NAS with no external auth service dependencies. Clerk was removed entirely.

## How it works
- Token format: `base64url(${studentId}:${exp}.${HMAC-SHA256(payload, secret)})`
- Secret: `STUDENT_JWT_SECRET` env var (falls back to `ADMIN_PASSWORD`)
- 30-day expiry
- `student_users` table: `id TEXT PK, email TEXT UNIQUE, password_hash TEXT, name TEXT`
- Table created at startup via `initStudentTables()` in `artifacts/api-server/src/routes/studentAuth.ts`
- `initStudentTables()` called in `artifacts/api-server/src/index.ts` alongside admin tables

## Frontend auth
- Token stored in `localStorage.student_token`
- User stored in `localStorage.student_user` as `{ id, email, name }`
- Helpers in `artifacts/harrowgate/src/lib/studentAuth.ts`: `getStudentToken()`, `getStudentUser()`, `isStudentLoggedIn()`, `studentSignOut()`, `getStudentAuthHeaders()`, `useStudentUser()`
- `authHeaders()` is now synchronous — no more `await authHeaders()` pattern (it was async when using Clerk's `session.getToken()`)

## API endpoints
- `POST /api/student/register` — email + password + optional name
- `POST /api/student/login` — email + password → token + student object
- `GET /api/student/me` — verify token, return student

## Password hashing
scrypt (same as admin auth) — no new npm deps needed.

## How to apply
- All student API routes use `verifyStudentToken()` from `studentAuth.ts`
- The `requireStudentAuth` middleware in `student.ts` extracts Bearer token and sets `req.studentUserId`
- DB column `clerkUserId` kept as-is (just stores the student UUID now — no migration needed)
