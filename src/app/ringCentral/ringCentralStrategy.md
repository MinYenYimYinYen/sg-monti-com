# RingCentral Integration Strategy

## Environment Variables

All RingCX variables are read lazily through `_lib/ringCxEnv.ts`. A missing required value throws a clear error on first use instead of producing `Bearer undefined`. Restart the dev server after editing `.env.local`.

| Variable | Required | Value |
|---|---|---|
| `RINGCX_DIGITAL_BASE_URL` | Digital | `https://<DOMAIN>.api.digital.ringcentral.com` (no trailing slash; use the host your tenant shows) |
| `RINGCX_DIGITAL_TOKEN` | Digital | API access token from the RingCX Digital admin. Inherits the permissions of the user it belongs to. |
| `RINGCX_WEBHOOK_SECRET` | Webhooks | You generate it. ASCII, under 256 characters. |
| `RINGCX_VERIFY_TOKEN` | Webhooks | You generate it. Used once per registration for the handshake. |
| `RINGCX_VOICE_BASE_URL` | Optional | Defaults to `https://ringcx.ringcentral.com/voice/api` |
| `RC_CLIENT_ID`, `RC_CLIENT_SECRET`, `RC_JWT` | Voice (not built yet) | From a RingCentral private app (JWT auth). Voice needs a RingCentral token exchanged for a RingCX token that expires after 5 minutes. The exchange is limited to 5 requests per minute, so the token must be cached. |

### Generate the two shared secrets

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice: one value for `RINGCX_WEBHOOK_SECRET`, one for `RINGCX_VERIFY_TOKEN`. RingCX does not generate them for you. Never commit them (`.env*` is gitignored).

### `.env.local`

```bash
# RingCX Digital
RINGCX_DIGITAL_BASE_URL=https://<DOMAIN>.api.digital.ringcentral.com
RINGCX_DIGITAL_TOKEN=<api access token>
RINGCX_WEBHOOK_SECRET=<generated>
RINGCX_VERIFY_TOKEN=<generated>
```

## Webhook Setup

Register in the RingCX Digital admin under Advanced Settings, then Webhooks.

- **URL**: must be public HTTPS. Locally, use a tunnel (ngrok or Cloudflare Tunnel) to `localhost:3000`. Routes live under `/ringCentral/api/webhooks/<group>/<event>`, for example `https://<host>/ringCentral/api/webhooks/interventions/opened`.
- **Secret**: the same value as `RINGCX_WEBHOOK_SECRET`.
- **Verification Token**: the same value as `RINGCX_VERIFY_TOKEN`.
- **Registered Events**: at least one. Selected events are all delivered to the registered URL.
- **API access token**: your own token unless you have the "Manage API access token" permission.

Registering triggers an immediate validation request. If it fails, the webhook is saved but disabled and must be re-enabled by hand, so have the dev server and tunnel running first.

```
GET https://<host>/ringCentral/api/webhooks/interventions/opened?hub.mode=subscribe&hub.challenge=<random>&hub.verify_token=<token>
```

The handler replies 200 with only the `hub.challenge` value.

### How the secret is checked

`X-Dimelo-Secret` carries the configured secret verbatim on every request. It is **not** an HMAC of the body. `_lib/verifyWebhookSecret.ts` compares it to `RINGCX_WEBHOOK_SECRET` in constant time. Because the secret travels in every request, the endpoint must use HTTPS. The header is absent when no secret is configured, so always configure one.

---

## Architecture Overview

### Inbound Communication (RingCX to Next.js)

**`_lib/createRingCxWebhookHandler.ts`**
- Factory for standardized webhook routes. GET answers the handshake, POST verifies the secret, returns 200 immediately and processes the event afterwards.
- `secret` and `verifyToken` are optional overrides. By default they come from `ringCxEnv`.

**`_lib/verifyWebhookSecret.ts`**: constant-time comparison of the `X-Dimelo-Secret` header.

#### Usage Pattern
```typescript
// src/app/ringCentral/api/webhooks/<group>/<event>/route.ts
import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";

const handler = createRingCxWebhookHandler<WebhookEvent<Task>>({
  eventName: "Task Created",
  handler: async (event) => {
    // Process event (save to DB, trigger workflows, etc.)
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
```

### Outbound Communication (Next.js to RingCX)

#### REST API Client System
Located in `src/lib/api/rest/`

**`restApi.ts`**
- Axios-like REST client using fetch under the hood
- Methods: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`
- Auto-stringifies JSON bodies
- Automatic `Content-Type: application/json`
- `.create()` method for pre-configured instances
- Reuses existing error handling (`AppError`, `ErrorResponse`)

**`RestConfig.ts`**
- TypeScript types for REST API configuration
- `RestConfig` interface with baseURL, params, body, headers
- `RestApiInstance` interface for configured clients

**`queryString.ts`**
- Query parameter serialization utilities
- Supports RingCX bracket notation for arrays and nested objects
- Example: `{ ids: [1, 2] }` becomes `?ids=1&ids=2`

#### Usage Pattern
```typescript
import { restApi } from "@/lib/api/rest/restApi";

// Direct usage
await restApi.get('/1.0/interventions', {
  baseURL: 'https://<DOMAIN>.api.digital.ringcentral.com',
  params: { category_ids: [4242, 2854] },
  headers: { 'Authorization': `Bearer ${token}` }
});

// Pre-configured instance (recommended)
const ringCx = restApi.create({
  baseURL: 'https://<DOMAIN>.api.digital.ringcentral.com',
  headers: { 'Authorization': `Bearer ${process.env.RINGCX_DIGITAL_TOKEN}` }
});

await ringCx.post('/1.0/interventions/123', {
  body: { status: 'closed' }
});
```
