---
name: ringcentral
description: Work on the RingCentral RingCX integration - Digital webhook route handlers under src/app/ringCentral/api/webhooks, signature verification, the PubSubHubbub verification handshake, RingCX REST client (ringCxClient, RingCxDigitalApi), RINGCX_* environment variables, and webhook event types. Use when adding or changing a webhook route, handling a RingCX event, calling the RingCX API, or debugging webhook verification.
---

# RingCentral / RingCX Integration

## What to read (and what not to)

- **Do not read `src/app/ringCentral/ringCentral.readme.md` (about 53 KB) in full.** It is a broad research-style guide on RingCX communication vectors, with footnote markers, not project rules. Open it only for a specific topic, using its headings (webhooks at "Event-Driven Webhooks in RingCX Digital", voice at "Voice Web Services...", auth at "Authentication and Session Management Topologies").
- **Start with `src/app/ringCentral/ringCentralStrategy.md`.** It is the project-specific doc: environment variables, setup workflow, and inbound/outbound architecture.
- Then read the code: `_lib/createRingCxWebhookHandler.ts`, `_lib/verifyWebhookSignature.ts`, `_lib/api/ringCxClient.ts`, `_lib/api/RingCxDigitalApi.ts`, `_lib/api/types/RingCxTypes.ts`.

## Webhook routes (inbound)

One folder per event under `src/app/ringCentral/api/webhooks/<group>/<event>/route.ts` (groups: `content`, `identities`, `interventions`, `tasks`). Copy `tasks/created/route.ts`:

```ts
const handler = createRingCxWebhookHandler<WebhookEvent<Task>>({
  secret: process.env.RINGCX_WEBHOOK_SECRET!,
  verifyToken: process.env.RINGCX_VERIFY_TOKEN!,
  eventName: "Task Created",
  handler: async (event, rawBody) => { /* process */ },
});
export const GET = handler.GET;
export const POST = handler.POST;
```

- **These routes are the one exception to "all routes use `createRpcHandler`"**: they use `createRingCxWebhookHandler`, because RingCX dictates the request/response protocol (GET handshake plus signed POST).
- GET: replies with `hub.challenge` when `hub.mode === "subscribe"` and `hub.verify_token` matches `RINGCX_VERIFY_TOKEN`; otherwise 403.
- POST: reads the raw body first, verifies the `X-Dimelo-Secret` HMAC signature against `RINGCX_WEBHOOK_SECRET` (403 on failure), parses the JSON, returns 200 immediately, then processes the event in a deferred callback. Errors after verification still return 200 so RingCX does not disable the webhook.
- Never parse the body before verifying the signature; the raw text is what is signed.
- Never log the secret or the verify token. The handler logs only whether the token matched.
- Caution: work scheduled after the response (`setImmediate`) is not guaranteed to finish on serverless hosts. The handler's own comment suggests a job queue for production. Keep event handlers short and idempotent, and flag the risk if a new handler does heavy or must-not-lose work.

## Outbound (Next.js to RingCX)

Use the existing client (`ringCxClient.ts`, `RingCxDigitalApi.ts`) and add typed methods there instead of calling `fetch` from routes or components. Keep tokens and credentials server-side only. Add new payload types to `RingCxTypes.ts`.

## Data handling

If an event handler writes to MongoDB, follow the `data-module` skill (type separate from model, natural keys, ISO date strings, `createModel`, `await connectToMongoDB()` and never close the connection).

## Environment variables

`RINGCX_WEBHOOK_SECRET` (ASCII, max 256 characters, must equal the value in the RingCX admin portal) and `RINGCX_VERIFY_TOKEN` (any string, same in both places). Both go in `.env.local`. Setup steps are in `ringCentralStrategy.md`.

## Verify

Run the IDE diagnostics on edited files. Webhook behavior cannot be exercised without RingCX or a signed test request, so say so rather than claiming it works. Do not start the dev server.
