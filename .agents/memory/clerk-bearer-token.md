---
name: Clerk Bearer token for student routes
description: Why student API calls must use explicit Authorization headers instead of relying on cookies.
---

## Rule
Every fetch to `/api/student/*` must pass an explicit `Authorization: Bearer <token>` header obtained via `useSession()` from `@clerk/react`.

**Why:** The Replit reverse proxy does not forward session cookies to the API server. `getAuth(req)` on the Express side (`@clerk/express`) therefore finds no session and returns 401. Passing the JWT as a Bearer token in the Authorization header works because HTTP headers are always forwarded.

**How to apply:**
```typescript
import { useSession } from "@clerk/react";
const { session } = useSession();

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await session?.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// In any fetch to /api/student/*:
const hdrs = await authHeaders();
const res = await fetch(url, { headers: { "Content-Type": "application/json", ...hdrs }, credentials: "include" });
```

Files that implement this pattern: Portal.tsx, PaymentPage.tsx, StudentDocManager.tsx, ApplyForm.tsx.

Also gate the initial `useEffect` on both `isLoaded` AND `session` being truthy, so the first fetch doesn't fire before the JWT is available:
```typescript
useEffect(() => { if (isLoaded && session) fetchSubmission(); }, [isLoaded, session]);
```
