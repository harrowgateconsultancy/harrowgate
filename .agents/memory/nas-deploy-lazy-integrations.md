---
name: NAS deploy - lazy Replit integrations
description: Replit-specific lib integration clients throw at module load time, crashing Node.js ESM startup on NAS
---

## The Problem
`lib/integrations-openai-ai-server/src/client.ts`, `audio/client.ts`, `image/client.ts` all have top-level `throw new Error(...)` if `AI_INTEGRATIONS_OPENAI_BASE_URL` is not set. In ESM these throw at module-link/run time, crashing the server before it starts.

## The Fix (Lazy Proxy pattern)
Replace module-level validation + instantiation with a lazy getter + Proxy export:

```ts
let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.SOME_VAR) throw new Error("...");
    _client = new Client({...});
  }
  return _client;
}
export const client = new Proxy({} as Client, {
  get(_target, prop) { return (getClient() as any)[prop]; }
});
```

**Why:** On NAS these env vars don't exist. The Proxy defers validation to first actual use (which never happens in NAS deployment since AI features aren't used).

**How to apply:** Any `lib/integrations-*` file that does top-level env checks + instantiation needs this treatment before building for NAS.

## Also fixed for NAS builds
- `lib/objectStorage.ts` / `objectAcl.ts`: `@google-cloud/storage` stubbed out entirely (NAS uses local storage mode)
- `build.mjs` externals: removed `nodemailer`, `handlebars`, `googleapis`, `openai` from external list so they bundle into index.mjs
- esbuild external packages in ESM output become static `import` statements → crash at Node.js link time if package not installed
