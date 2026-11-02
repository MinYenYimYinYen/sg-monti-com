# QBO Integration - Phase 2: Auth, Token Store, HTTP Layer, Connection

## Required Reading

- `src/lib/api/api.readme.md`, `src/lib/errors/errors.readme.md`
- `src/app/realGreen/_lib/api/rgHttp.ts` (the model for `qboHttp`)
- Skills: `api-route`, `data-module`

## Goal

A working, admin-initiated connection to the single QBO company, with safe automatic token refresh, and one smoke-test call.

## Design

### Token store
- One document, natural key `realmId`. Fields: encrypted access token, encrypted refresh token, access expiry, refresh expiry (ISO strings), connected-by `userName`, `connectedAt`, a `version` counter for compare-and-swap.
- Encrypt tokens at rest (AES-256-GCM via Node `crypto`, key from `QBO_TOKEN_ENCRYPTION_KEY`). Crypto and expiry logic are pure helpers. Note: the existing auth system uses bcrypt, which is one-way hashing and cannot be reused here because we must recover the tokens to call QBO. The privacy policy (`/legal/privacy`) promises encrypted token storage, so this must be implemented as written.
- Model via `createModel`. Type separate from the model file. Sanitize with `cleanMongoObject`; tokens never go to the client.

### Refresh
- Access tokens are short-lived (about an hour). Refresh tokens ROTATE: every refresh returns a new one, and reusing an old one can revoke the grant.
- Serverless means concurrent invocations. Refresh must be atomic: claim the refresh with a conditional update on `version`; the loser re-reads the winner's tokens instead of refreshing.
- Refresh proactively when the access token is within a few minutes of expiry, and once reactively on a 401.
- Store the refresh-token expiry and expose it in `status` for the Phase 7 warning. Verify the current maximum refresh-token lifetime in Intuit's docs.

### qboHttp
- Single fetch chokepoint like `rgHttp`: base URL by `QBO_ENVIRONMENT`, `Authorization: Bearer`, `Accept: application/json`, pinned `minorversion`.
- Maps failures to `AppError` (`EXTERNAL_ERROR`, `NETWORK_ERROR`). Parses the `Fault` envelope. Request-level failures (401, 429, timeouts) are distinct from per-item batch faults (Phase 6).
- `qboApi.ts`: typed endpoint registry with `pathTemplate`, like `rgApi.ts`.
- `createQboRpcHandler.ts`: wraps `createRpcHandler`. Optional API call logging, modeled on `rgApiLog`, can be added later.

### Connection routes
- RPC ops (admin only): `status`, `startConnect` (returns the Intuit authorize URL with a CSRF `state` stored server-side), `disconnect`.
- OAuth callback is a browser GET redirect from Intuit, so it is a plain `GET` route handler, an exception to the POST-only RPC pattern. It validates `state`, receives `code` and `realmId`, exchanges the code, stores tokens, redirects back to the admin page.
- Admin page: shows connected/not connected, company name, refresh-token expiry, Connect/Reconnect/Disconnect.

## Your Tasks

- [ ] Phase 1 complete and env vars set.
- [ ] When the Connect page exists: click Connect, sign in as a QuickBooks admin, approve the app against the **sandbox** company.
- [ ] Confirm the smoke test (company info) displays the sandbox company name.

## Our Tasks

- [ ] `connection/types/QboConnectionTypes.ts`, `models/QboConnectionModel.ts`
- [ ] Pure helpers: encrypt/decrypt, `isExpiringSoon`, authorize-URL builder
- [ ] `_lib/api/qboHttp.ts`, `qboApi.ts`, `createQboRpcHandler.ts`
- [ ] Atomic refresh in a server function
- [ ] Contract + route (`status`, `startConnect`, `disconnect`) and `GET` callback route
- [ ] Admin page with `PageLayout` and correct scroll context
- [ ] Smoke test: `companyinfo` call

## Done Criteria

- [ ] Connected to the sandbox company, tokens encrypted in Mongo.
- [ ] Two concurrent requests with an expired access token cause exactly one refresh.
- [ ] Disconnect clears tokens.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.