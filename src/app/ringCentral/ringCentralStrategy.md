# RingCentral Integration Strategy

## Environment Variables

### Webhook Configuration

#### `RINGCX_WEBHOOK_SECRET`
**Purpose**: Used to cryptographically verify webhook payloads are actually from RingCX

**Requirements**:
- ASCII string only (no special encoding)
- Maximum 256 characters
- You define this value when registering the webhook in RingCX admin interface
- RingCX uses it to generate HMAC SHA256 signature sent in `X-Dimelo-Secret` header
- Your Next.js app uses the same secret to verify the signature

**Where to set it**:
- RingCX Admin Portal > Webhooks > Create/Configure Webhook > "Secret" field
- Copy the exact same value to your `.env.local`

---

#### `RINGCX_VERIFY_TOKEN`
**Purpose**: Used for the initial webhook handshake verification (PubSubHubbub protocol)

**Requirements**:
- Any string value you choose
- You define this when registering the webhook in RingCX admin interface
- RingCX sends this back to you in the GET request as `hub.verify_token` query param
- Your Next.js app validates it matches what you configured

**Where to set it**:
- RingCX Admin Portal > Webhooks > Create/Configure Webhook > "Verification Token" field
- Copy the exact same value to your `.env.local`

---

## Setup Workflow

### 1. In your `.env.local`:
```bash
# RingCX Digital Webhook Configuration
RINGCX_WEBHOOK_SECRET=your_random_secret_here_max_256_chars
RINGCX_VERIFY_TOKEN=your_verification_token_here
```

### 2. In RingCX Admin Portal:
When you configure the webhook endpoint (pointing to your Next.js route):
- **URL**: `https://yourdomain.com/ringCentral/webhooks/digital`
- **Secret**: Paste the same value as `RINGCX_WEBHOOK_SECRET`
- **Verification Token**: Paste the same value as `RINGCX_VERIFY_TOKEN`
- **Environment**: Production or Staging

### 3. RingCX will immediately send a GET request to verify:
```
GET https://yourdomain.com/ringCentral/webhooks/digital?hub.mode=subscribe&hub.challenge=random_string&hub.verify_token=your_verification_token_here
```

Your handler validates the token and responds with the `hub.challenge` value.

---

## Security Best Practices

**Generate strong secrets**:
```bash
# Generate a random secret (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Never commit to git** - keep them in `.env.local` (already gitignored in Next.js projects)

Both values are just shared secrets you create - RingCX doesn't generate them for you.

---

## Architecture Overview

### Inbound Communication (RingCX to Next.js)

#### Webhook Handler System
Located in `src/app/ringCentral/_lib/`

**`createRingCxWebhookHandler.ts`**
- Factory function for creating standardized webhook handlers
- Handles both GET (verification) and POST (event processing) requests
- Automatically validates signatures and returns 200 OK immediately
- Processes events asynchronously to meet RingCX response time requirements
- Consistent error handling and logging

**`verifyWebhookSignature.ts`**
- HMAC SHA256 signature verification utility
- Validates `X-Dimelo-Secret` header against raw request body
- Uses constant-time comparison to prevent timing attacks

#### Usage Pattern
```typescript
// src/app/ringCentral/webhooks/digital/route.ts
import { createRingCxWebhookHandler } from "@/app/ringCentral/_lib/createRingCxWebhookHandler";

const handler = createRingCxWebhookHandler({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Digital Webhook",
  handler: async (event, rawBody) => {
    // Process event (save to DB, trigger workflows, etc.)
  }
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
  baseURL: 'https://domain.api.engagement.dimelo.com',
  params: { category_ids: [4242, 2854] },
  headers: { 'Authorization': `Bearer ${token}` }
});

// Pre-configured instance (recommended)
const ringCx = restApi.create({
  baseURL: 'https://domain.api.engagement.dimelo.com',
  headers: { 'Authorization': `Bearer ${process.env.RINGCX_TOKEN}` }
});

await ringCx.post('/1.0/interventions/123', {
  body: { status: 'closed' }
});
```
