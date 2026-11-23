# Harrowgate on GoDaddy Node.js Hosting

This ZIP is a prebuilt single Node.js app for GoDaddy Node.js Hosting. It includes
the API server, the root-path React site, and the required production dependencies.
It contains no `.env` file, `node_modules`, or live database data.

## If GoDaddy logs `vite: not found`

Do not connect GoDaddy to the monorepo root and run its `dev` script. That script
starts the API and Vite development server separately, and is not the production
deployment. Upload this prepared ZIP instead; its root `package.json` starts the
API, which serves the built Harrowgate site from the same app. The npm warnings
about `auto-install-peers` and `strict-peer-dependencies` are non-fatal; those
pnpm-only settings are not included in this ZIP.

## GoDaddy app settings

1. Upload this ZIP through **GoDaddy Node.js Hosting**. Deluxe includes Node.js
   Hosting app slots.
2. Use the private preview first. Select the **Europe** app region if available,
   and choose the same or nearest available region for the PostgreSQL database.
3. Add these environment variables in the GoDaddy app's **Secrets** settings:

   | Variable | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `DATABASE_DRIVER` | `neon` |
   | `DATABASE_URL` | Neon PostgreSQL connection string, stored as a secret |
   | `LOCAL_UPLOAD_DIR` | `/private/uploads` |
   | `STUDENT_JWT_SECRET` | A newly generated random secret |
   | `ADMIN_USERNAME` | Your chosen admin username |
   | `ADMIN_PASSWORD` | A new, strong admin password |

   GoDaddy supplies `PORT`. Do not set it manually. Leave
   `PRIVATE_OBJECT_DIR` and `PUBLIC_OBJECT_SEARCH_PATHS` unset; those enable
   Replit-specific object storage. `/private` is GoDaddy's persistent private
   storage location and survives redeploys.

4. Add optional secrets for features you use:
   - Google sign-in: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Google Drive/Sheets: `GOOGLE_SERVICE_ACCOUNT_JSON`,
     `GOOGLE_DRIVE_ROOT_FOLDER_ID`, `GOOGLE_SHEETS_ID`
   - Email: `GMAIL_USER`, `GMAIL_APP_PASSWORD`
   - Notifications and integrations: `NTFY_TOPIC`, `CALLMEBOT_API_KEY`,
     `MEGA_PASSWORD`, `WEBDAV_URL`, `WEBDAV_USERNAME`, `WEBDAV_PASSWORD`,
     and `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL`

   Configure the Google OAuth callback URL for the final domain in the Google
   Cloud OAuth client before enabling Google sign-in. Never put secrets in this
   ZIP, a GitHub commit, or a chat message.

## PostgreSQL setup and existing data

GoDaddy Node.js Hosting only permits outbound HTTP/HTTPS connections from the
app. The `neon` driver uses PostgreSQL over WebSockets on HTTPS, rather than a
direct TCP connection to port 5432.

- For a **new empty Neon database**, leave `SKIP_DB_MIGRATIONS` unset. The app
  applies the bundled Drizzle migrations at startup. Set
  `REQUIRE_DB_MIGRATIONS=true` so a migration failure stops startup visibly.
- To **move the existing NAS database**, back it up first and restore the full
  PostgreSQL dump to a new Neon database. Do not import into a database that
  contains data you need to keep. Because the NAS database may already have
  tables without matching migration history, first run the included
  `database/migrate-existing-postgres.sql` against the restored database, then
  set `SKIP_DB_MIGRATIONS=true` for the imported database. The app still
  performs its normal startup checks.

Keep the existing NAS database and uploads untouched until the GoDaddy preview
has been checked against the restored data.

## Existing uploaded documents

The app writes uploads to `/private/uploads`. To bring over files from the NAS,
copy the contents of its persistent uploads volume into the GoDaddy app's
**Private Storage** area at `/private/uploads`. Preserve the existing filenames;
the database stores references to those filenames.

## Cloudflare and the custom domain

1. In GoDaddy Node.js Hosting, add `harrowgateconsultancy.com` as the app's
   custom domain and wait for GoDaddy to show the DNS records it requires.
2. In Cloudflare DNS, enter those exact records. Do not leave the same hostname
   pointed at the old NAS tunnel or another origin.
3. Initially set the hostname to **DNS only** in Cloudflare while GoDaddy
   validates the domain and issues its HTTPS certificate.
4. After GoDaddy reports HTTPS is active and the custom domain works, you may
   enable Cloudflare proxying. Keep Cloudflare SSL/TLS mode on **Full (strict)**.

Do not delete the NAS or its database until the GoDaddy app, login, uploads,
Google sign-in, and admin portal have all been verified.
