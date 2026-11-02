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
- Refresh proactively when the access token is within a few minutes of expiry, and once reactively on a 401. Never refresh on every call. (Questionnaire answer: "Only when access tokens expire".)
- Retry policy: one retry after a refresh on a 401; bounded retry with backoff on 429 and timeouts; never a retry loop.
- `invalid_grant` (refresh token revoked, already rotated or expired) and an expired refresh token are final. Clear the stored tokens, set the connection to "reconnect required", disable posting, leave rows `pending`, and stop retrying. The compare-and-swap lock exists to avoid causing `invalid_grant` ourselves.
- Store the refresh-token expiry and expose it in `status` for the Phase 7 warning. Verify the current maximum refresh-token lifetime in Intuit's docs.

### OAuth endpoints (from Intuit's discovery document)
Hardcode as constants with a comment naming the document (`https://developer.api.intuit.com/.well-known/openid_configuration`, and `openid_sandbox_configuration` for sandbox). Both list the same OAuth endpoints, so sandbox and production differ only in the accounting API base URL and client keys.
- Authorization: `https://appcenter.intuit.com/connect/oauth2`
- Token (code exchange and refresh): `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- Revocation: `https://developer.api.intuit.com/v2/oauth2/tokens/revoke`. Disconnect calls this so the grant is removed at Intuit too, not only in our database.
- Token auth methods supported: `client_secret_post` and `client_secret_basic`.

### qboHttp
- Single fetch chokepoint like `rgHttp`: base URL by `QBO_ENVIRONMENT`, `Authorization: Bearer`, `Accept: application/json`, pinned `minorversion`.
- Maps failures to `AppError` (`EXTERNAL_ERROR`, `NETWORK_ERROR`). Parses the `Fault` envelope. Request-level failures (401, 429, timeouts) are distinct from per-item batch faults (Phase 6).
- `qboApi.ts`: typed endpoint registry with `pathTemplate`, like `rgApi.ts`.
- `createQboRpcHandler.ts`: wraps `createRpcHandler` and writes the QBO call log (below).

### QBO API call log (required: questionnaire commitments)
The RealGreen `rgApiLog` only stores call counts per endpoint, so it cannot be reused. The questionnaire answers (capture `intuit_tid`, store error information in shareable logs) require one record per call.
- **Record (`QboApiLogDoc`, natural key `logId` UUID, ISO string dates):** `intuitTid` (response header, captured on every response including OAuth token and revoke calls), timestamp, duration, RPC operation name, endpoint `pathTemplate` and method, HTTP status, outcome (`success`, `fault`, `networkError`, `timeout`), fault `type` and every `Error[]` entry (`code`, `Message`, `Detail`, `element`), for batches the `bId` row IDs and per-item results, retry attempt number, `userName`, `realmId`, and the request body for failed calls only.
- **Never stored:** access or refresh tokens, `Authorization` headers, the client secret. A pure `redact` helper enforces this and is tested. The client ID and secret are read from server-side env vars only (no `NEXT_PUBLIC_` prefix) and must never reach a client bundle, a log or an error response.
- **Retention:** per-record `expireAt` with a Mongo TTL index. Proposed 90 days for successes, 365 days for failures. UNCONFIRMED.
- **Capture:** `qboHttp` pushes a call record into an `AsyncLocalStorage` list for the current request (same pattern as `rgHttp`). `createQboRpcHandler` writes the list with one awaited `insertMany` in a `finally`, because an unawaited write can be lost when a Vercel function ends. The OAuth callback and any cron route open the same bracket manually. A logging failure must never fail the real operation; catch it and write to the server console.
- **Recall:** admin viewer at `/qbo/log` (access level UNCONFIRMED: admin only by default). Filters by date, outcome and operation; search by `intuit_tid`; a copy-for-Intuit-support button that outputs the redacted JSON.
- **Import rows:** failed `importRow`s store `intuitTid` and fault details. Phase 6's results screen shows the reference ID beside each failure, and user-facing QBO error messages include it.

### Connection routes
- RPC ops (admin only): `status`, `startConnect` (returns the Intuit authorize URL with a CSRF `state` stored server-side), `disconnect`.
- OAuth callback is a browser GET redirect from Intuit, so it is a plain `GET` route handler, an exception to the POST-only RPC pattern. It validates `state` (one-time, expires after about 10 minutes, deleted on first use; a missing, mismatched, expired or reused `state` is a CSRF error and is rejected), receives `code` and `realmId`, exchanges the code, stores tokens, redirects back to the admin page.
- Admin page: shows connected/not connected, company name, refresh-token expiry, Connect/Reconnect/Disconnect. **Fixed path: `/qbo/connection`.** The Intuit Connect/Reconnect URL sends users through login with `from=/qbo/connection` (see `qboPhase1.md`), so do not move it.
- **Callback auth:** the callback path (`/qbo/connection/api/callback`) contains `/api`, so `src/proxy.ts` lets it through without a login check (the `isApi` gate). The handler therefore cannot rely on the proxy. It must itself verify a signed-in `admin` session and validate the stored one-time `state` before exchanging the code, and it must reject anything else.

## Your Tasks

- [ ] Phase 1 complete and env vars set.
- [ ] When the Connect page exists: click Connect, sign in as a QuickBooks admin, approve the app against the **sandbox** company.
- [ ] Confirm the smoke test (company info) displays the sandbox company name.

## Our Tasks

- [ ] `connection/types/QboConnectionTypes.ts`, `models/QboConnectionModel.ts`
- [ ] Pure helpers: encrypt/decrypt, `isExpiringSoon`, authorize-URL builder
- [ ] `_lib/api/qboHttp.ts`, `qboApi.ts`, `createQboRpcHandler.ts`
- [ ] Atomic refresh in a server function, with `invalid_grant` and expired-refresh-token handling
- [ ] `qboApiLog/` module: types, model with TTL index, `redact` helper, `AsyncLocalStorage` capture of `intuit_tid`, `/qbo/log` viewer
- [ ] Optional: "Contact support" link on the connection page (see `qboQuestionnaire.md` open question)
- [ ] Contract + route (`status`, `startConnect`, `disconnect`) and `GET` callback route
- [ ] Admin page with `PageLayout` and correct scroll context
- [ ] Smoke test: `companyinfo` call

## Done Criteria

- [ ] Connected to the sandbox company, tokens encrypted in Mongo.
- [ ] Two concurrent requests with an expired access token cause exactly one refresh.
- [ ] Disconnect revokes the grant at Intuit and clears tokens.
- [ ] Every call, success or failure, produces a log record containing `intuit_tid`, and no tokens appear in logs.
- [ ] A replayed or expired `state` is rejected.
- [ ] A revoked grant produces "reconnect required" and no retry loop.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.