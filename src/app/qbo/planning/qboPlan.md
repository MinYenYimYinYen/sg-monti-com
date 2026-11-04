# QBO Integration: Plan

This is the single working plan for the QuickBooks Online (QBO) integration. It states the strategy, the decisions that matter, and the phases with their rationale. It deliberately avoids file-level detail: the code, the skills in `.claude/skills/`, and the readmes govern that.

**Agents: ignore `planning/archive/` unless the user asks you to look into it.** It holds the original phase docs (`qboPhase0.md` to `qboPhase7.md`). They are superseded by this file and parts of them are wrong now (sandbox assumptions, the Raw/Core/Doc type pipeline, the mirror). Do not follow them.

Other files in this folder:
- `qboQuestionnaire.md`: the answers given on Intuit's production questionnaire, tracked as commitments. Still current. Tick a row only when the behavior is built and verified.
- `sampleData/`: redacted Capital One and Chase CSV exports.

## Goal

Replace one-at-a-time expense entry in QBO with a fast monthly flow: import credit card CSV exports, map each merchant to a QBO vendor and expense account (mappings are remembered), then post the month's expenses to QBO in batches. Target: about 2 hours down to about 10 minutes.

Non-goals: this is not a QBO suite. No classes, locations, bank feeds, refund or credit handling, or editing and voiding of posted transactions. One company only (single realm).

## Working Agreements

- **Live data from the start.** We skipped the sandbox. The production Client ID and Secret are in use, and the connection works in dev and production.
- **Read before write.** While the system is assembled, we only attempt read operations against the real books. This is a working agreement, not a code guard. Writes are intended; they are simply not built yet. Do not add write operations until the user says the write phase has started.
- **First writes are staged.** See Phase E.
- **Dev and production share one MongoDB, one token document and one encryption key.** A token refresh from either environment rotates the token for both. `QBO_TOKEN_ENCRYPTION_KEY` must be identical in `.env.local` and Vercel Production.
- **Questionnaire answers are commitments.** Before going live with anything new, recheck `qboQuestionnaire.md` against what was built.

## Key Decisions

### Transactions
- Entity: QBO `Purchase` with `PaymentType: "CreditCard"`. `AccountRef` is the credit card account, `EntityRef` is the vendor, with one `AccountBasedExpenseLineDetail` line (expense account plus optional memo as line `Description`).
- `TxnDate` is the transaction date, not the posted date. The Chase `Memo` column is ignored; the user may type a memo on any row.

### Types (decided: no remap pipeline)
- QBO entities use **Intuit's own type definitions and PascalCase names** (`DisplayName`, `SyncToken`, `AccountRef`). We do not use the `Raw` / `Core` / `Doc` / `Props` layering from RealGreen, and we do not write `remap*` functions. We are not extending these types, and Intuit's shapes are stable (we pin `minorversion`). This intentionally deviates from the type-suffix table in `AGENTS.md`. Do not "fix" it.
- **Write out every field Intuit documents, and comment out the ones we do not use.** That keeps the full surface visible in the code, so nobody has to dig through Intuit's documentation again if requirements change. Fields we read, write, or must echo back (such as `Id` and `SyncToken`) stay uncommented.
- Types for our own data (import rows, mappings, card assignments, the token store) follow the normal `Doc` / `Props` / no-suffix convention. The deviation applies only to QBO entities.
- Types are built from definitions the user pastes from Intuit's API reference (it is rendered by JavaScript, so it cannot be fetched). The index of available pages, with build status, is `../typeReferences/availableReferences.md`. Record the pinned `minorversion` in `qboApi` once chosen. The reference page was on minor version 75 when this plan was written; confirm before pinning.

### Loading reference data (decided: no mirror, revisit if needed)
- Vendors and accounts are loaded from the QBO API each session, the way RealGreen loads things like tax codes, and held in the Redux slice. No Mongo mirror and no sync job.
- When we create an entity (for example a vendor), we update slice state optimistically so the session stays in sync.
- Rationale: one company, so API quota is not a concern, and the loads are cheap. A mirror adds a sync job, staleness and a second source of truth.
- Vendors are the likely pressure point (there are many). If load time proves painful, add a mirror then. The slice and selector shapes should not need to change.
- Consequence: the posting pre-flight check (vendor and account still active) runs against the session's loaded data, and a fault from QBO is the final authority.

### Adding a QBO entity (workflow and pattern; `account/` is the reference)

**Bringing in Intuit's documentation**
1. The user pastes the entity's reference page (rendered by JavaScript, so agents cannot fetch it). Ask for the Query operation page and any enum or shared-type pages the entity page names but does not define. Do not fill gaps silently.
2. Write the type file from the paste: every documented field, unused ones commented out, optional fields marked `?` (sample responses omit them). Note the minor version in a comment.
3. Anything written from memory or inferred is marked `UNVERIFIED` in a comment, and recorded in Open Questions below until checked against real data.
4. Update the entity's row in `../typeReferences/availableReferences.md` (status, minor version, where it is displayed).

**Files per entity** (`src/app/qbo/<entity>/`, camelCase folder, mirrors RealGreen minus the Raw/Core/Doc layers)
- `types/Qbo<Entity>Types.ts`: Intuit's shape and PascalCase names. Shared pieces (`QboReference`, `QboCurrencyRef`, `QboModificationMetaData`, fault types) live in `_lib/types/QboCommonTypes.ts`.
- `_lib/qbo<Entity>Server.ts`: server loader. Reads go through `qboQueryAll({ entity, where })`, which pages through Intuit's query (1000 per page, stops on a short page, throws past a page cap). Pass an explicit `where`; a bare query may return active records only, and we want inactive ones visible so a mapping that points at one can be flagged.
- `_lib/qbo<Entity>Utils.ts`: pure helpers (filters, pickers). Selectors call these, so the logic is testable without a store.
- `api/Qbo<Entity>Contract.ts` and `api/route.ts`: one op per action, roles `office` and `admin`, route built with `createQboRpcHandler` (never `createRpcHandler` directly; it is the seam for the call log).
- `qbo<Entity>Slice.ts`: holds the entities as Intuit returned them (no `Doc` layer), one `createStandardThunk` per op, `fulfilled` replaces the array. Registered in `src/store/reducers/index.ts` as `qbo<Entity>`.
- `qbo<Entity>Select.ts`: `<entities>` (everything, including inactive), `<entity>Map` keyed by Intuit `Id`, and any derived lists. Selectors return all records; filtering by `Active` is the caller's job when offering a choice.
- `useQbo<Entity>.ts`: `useQbo<Entity>({ autoLoad })` dispatches the load with `staleTime: qboConst.referenceCacheTime` (15 minutes, so each session loads once) and returns `refresh` (forced reload). Actions only, per the data-module skill.

**Endpoints and writes**
- Only register an endpoint in `qboApi.ts` when a module needs it. No write endpoints exist yet (read before write). When the write phase starts, add them there with their `pathTemplate`.
- Server code throws `AppError` with type `EXTERNAL_ERROR` or `NETWORK_ERROR`, never `AUTH_ERROR`, so the browser does not think the user's own login expired.

**Where it is displayed**
- `/sandbox/qboTest` is a tab layout (`src/app/sandbox/qboTest/`) for eyeballing live entities. `layout.tsx` calls `useQboTestDeps()` once, each tab is a thin `page.tsx` rendering one panel, and unbuilt entities are `QboTestStub` tabs. Add a tab and its hook call in `useQboTestDeps` when a new entity is built.

### Auth and connection (built)
- OAuth 2.0 authorization-code flow, hand-rolled with `fetch` (no `intuit-oauth`, no `node-quickbooks`), like `rgHttp`.
- Tokens are AES-256-GCM encrypted in MongoDB. The privacy policy promises encrypted storage; bcrypt cannot be used because we must recover the tokens.
- Refresh tokens rotate, and the app runs on serverless, so refresh must be atomic (compare-and-swap on a `version` counter). Refresh when the access token is near expiry and once after a 401. One retry, never a loop.
- `invalid_grant` and an expired refresh token are final: clear the tokens, show "reconnect required", disable posting, leave rows `pending`.
- The OAuth callback is a plain `GET` route (an exception to the POST-only RPC pattern). It cannot rely on login cookies (`SameSite=strict`, cross-site redirect), so it validates a one-time server-side `state` that carries the connecting admin's `userName`, then re-checks that the user is still an admin.
- OAuth endpoints are hardcoded from Intuit's discovery document, with a comment naming it.
- Intuit URLs: host domain `sgmonti.com`, Launch `/auth/login`, Disconnect `/auth/logout`, Connect/Reconnect `/auth/login?from=/qbo/connection`. Legal pages are `/legal/terms` and `/legal/privacy`.
- Secrets (`QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_TOKEN_ENCRYPTION_KEY`) live only in env vars, never with a `NEXT_PUBLIC_` prefix, and never in logs, error responses or the browser.

### Logging (questionnaire commitment)
- One record per QBO call, including OAuth token and revoke calls, capturing the `intuit_tid` response header, status, outcome, and fault details. Never store tokens, `Authorization` headers or the client secret (a tested `redact` helper enforces this).
- Records are written with an awaited `insertMany` at the end of the request, because an unawaited write can be lost when a Vercel function ends. A logging failure must never fail the real operation.
- Retention (proposed 90 days for successes, 365 for failures) and viewer access (admin only) are unconfirmed.

### Import behavior
- **Every CSV row is persisted with a status**, including skipped rows. A transaction that appears in a CSV must be logged. Statuses: `pending`, `skipped`, `posting`, `posted`, `failed`, `unknown`.
- **Formats:** a CSV format is identified by a hash of its normalized header. Parsers are registered in code, one per fingerprint. An unknown header is rejected with a clear message.
- **Format to account:** each format maps to a QBO credit card account (a default plus optional others).
- **Card assignment:** keyed by `(formatId, last4)`. Import is blocked until every last4 in the file is assigned to a responsible site user, with an optional cardholder name.
- **Merchant mapping:** `merchantKey` (a normalized description, user-editable) maps to a vendor, a default expense account, and a growing list of other accounts. Mapping docs carry an owner-scope field (null = everyone) so per-user rules can be added later. Per-user mapping is not built now, but nothing should preclude it. Exact normalization rules are tuned against real data.
- **Skips:** reasons are defined in code. Payments and refunds are skipped automatically and never posted. `inventoryPurchase` is a manual skip, with an optional "always skip this merchant" rule. Refunds are handled by the user via journal entry in QBO.
- **Classification:** Chase `Type` of `Sale` is postable, `Payment` is a payment skip, `Return` is a refund skip, and anything else stops the import with an error naming the type. Capital One: Debit is postable, Credit with category `Payment/Credit` is a payment, any other Credit is a refund. More export samples would confirm this.
- **Duplicates:** neither bank gives a transaction ID, so identity is a hash of minimal row columns scoped by `formatId`. Identical rows in one file are handled by multiplicity (the file holds M, the database holds N, so M-N are new). A soft "possible duplicate" flag (same card, amount and date, different description or post date) asks the user to confirm and never blocks.
- **Access:** `office` and `admin` may import, enforced in API handler `roles`. Connection management is `admin`.

### Posting behavior
- Batches of up to 30 items, at most 40 batch requests per minute per realm. Items are independent and execution order must not be assumed, so a vendor must be created before the purchases that use it, not in the same batch.
- Results are matched by `bId` (our row ID). Partial success is expected and reported per row.
- `DocNumber` (shown as Ref no. on the QBO expense form) holds a short marker derived from the row hash (max 21 chars). It is how we find our own transactions again.
- A timeout or network error after sending leaves the outcome unknown. Mark rows `unknown`, not `failed`, and reconcile by querying for the `DocNumber` markers before any retry.
- Validation faults are per row: the row is `failed`, shows the message, and stays editable and retryable. Error 610 does not say which reference is inactive, so re-load vendors and accounts and ask the user to re-pick. A duplicate vendor name (error 6240) offers to map to the existing vendor instead.
- Posted rows are locked in our app. Corrections happen in QBO.

## Phases

Each phase leaves the system in a useful, checkable state. The order moves from the safest layer outward.

### Phase A: Connect (done)
Intuit app and keys, OAuth, encrypted token store, connect, disconnect and status page, legal pages, logout page.
**Why first:** everything depends on a trustworthy, admin-controlled connection, and the questionnaire commitments about tokens and CSRF are verified here.

Remaining odds and ends: the Intuit pricing tier and API call limits check, and the questionnaire support-contact question.

### Phase B: Reliable read layer and the first vertical slice
Build `qboHttp` (the single fetch chokepoint, modeled on `rgHttp`), `qboApi` (typed endpoint registry), and `createQboRpcHandler`. Add atomic refresh with `invalid_grant` handling, and the per-call log with `intuit_tid` capture. Prove it with a `companyinfo` smoke test on the connection page, then build **Account** end to end as the pattern-setting slice: types, contract, route, slice, thunks, hook, selectors, following the `data-module` skill and the RealGreen folder structure.
**Status:** token access with atomic refresh, `qboHttp`, `qboApi` (query endpoint only), `qboQuery`, `createQboRpcHandler` (delegates only), and the Account module with its `/sandbox/qboTest` tab are written but not yet exercised against live QuickBooks. Not built: the per-call log (deliberately deferred; early calls go unlogged), the `companyinfo` smoke test, and the unit tests.
**Why now:** failure handling, token refresh and logging are cheapest to get right while only reads are possible. Account is a read-heavy entity, so it establishes the pattern (query pagination, types written from Intuit's definitions, session-loaded slice) before we repeat it.

### Phase C: Remaining reference data
Vendor, then any other entity types we need (`Purchase`, the batch envelope, `Line`, the `*Ref` types), built from pasted Intuit definitions using the Account pattern. Phase C is read-only: the `createVendor` write operation is added in Phase E, but keep the Vendor slice shaped so optimistic updates on create slot in without rework.
**Why separate:** with the pattern settled, these are mostly mechanical. Vendor is the highest-volume list, so it is where we find out whether the no-mirror decision holds.

### Phase D: CSV import and mapping (local only)
Format registry and parsers, card assignment, format-to-account mapping, merchant mapping, skips, duplicate detection, persisted import rows, and the import page. Nothing is posted. Put logic in pure functions (parsers, normalization, hashing, classification, duplicate comparison) and offer tests for them.
**Why before writing:** it carries no risk to the books, and it can be checked on real files, including months already entered by hand. By the end, the posting phase is the only unknown left.

### Phase E: Writes: vendor creation and posting
Vendor creation (the `createVendor` contract op, thunk and optimistic slice update), then batch posting with per-row results, fault handling, `unknown` reconciliation, locking, and a results screen.
**Staged first writes (replaces sandbox rehearsal):**
1. Post one or two real rows. Verify them in the QBO UI: vendor, account, date, amount, memo, and the Ref no. marker. Delete them in QBO if needed.
2. Post a small file.
3. Post a full month and compare totals against the card statement.

Things to confirm during stage 1 because no sandbox is available: the shape of a successful `Purchase` inside `BatchItemResponse`, that `DocNumber` appears as Ref no., that duplicate `DocNumber` values are accepted, that purchases can be found by `DocNumber` for reconciliation, and the real fault payloads. Several of these (syntax and validation faults, `intuit_tid` presence) can be exercised with harmless reads or deliberately bad requests earlier. The questionnaire answer "tested that the app handles API errors, including syntax and validation errors" must be true before production approval.
**Why last:** writes to real books are the only irreversible-ish step, so they come after the connection, the read layer and the import flow are proven.

### Phase F: Hardening and operations
Refresh-token expiry warning on the status page (verify the current maximum lifetime in Intuit's docs), the revoked-grant experience ("reconnect required", posting disabled, rows stay `pending`), the `/qbo/log` viewer with `intuit_tid` search and a copy-for-support button, a short runbook (reconnect, re-load data, handling `failed` and `unknown` rows, finding a call by `intuit_tid`), and a walkthrough of `qboQuestionnaire.md`.
**Why last:** these protect an app that already works. The viewer and warning matter once the thing is in regular monthly use.

## Folder Layout (target)

Mirror the RealGreen folder structure (`types/`, `api/` with contract and route, slice, select, `useX` hook), minus the Raw/Core/Doc layering and mirror models.

```
src/app/qbo/
  planning/             this plan, questionnaire, sampleData/, archive/
  _lib/api/             qboHttp.ts, qboApi.ts, createQboRpcHandler.ts
  _lib/auth/            token crypto and refresh helpers (pure where possible)
  connection/           token model, connect/callback/status/disconnect, admin page
  account/              Intuit Account types, contract, route, slice, select, hook
  vendor/               Intuit Vendor types, contract (read now, create in Phase E), slice, select, hook
  csvImport/            formats, formatAccount, cardAssignment, merchantMapping, skipRule, importRow
```

## Environment Variables

| Name | Purpose |
|---|---|
| `QBO_CLIENT_ID` | Intuit app client ID (production) |
| `QBO_CLIENT_SECRET` | Intuit app client secret (production) |
| `QBO_REDIRECT_URI` | `https://sgmonti.com/qbo/connection/api/callback`, must match the Intuit app exactly |
| `QBO_ENVIRONMENT` | `production` |
| `QBO_TOKEN_ENCRYPTION_KEY` | Key for encrypting tokens at rest, identical in dev and production |

## Open Questions

- Verified on the first live Account load (285 accounts): the `Active IN (true, false)` query syntax works and returns inactive accounts, every `AccountType` was recognized, and classification behaved as expected. Still to decide: whether `Classification === "Expense"` (which includes Cost of Goods Sold and Other Expense) is the right set for the mapping dropdown, and whether to pin minor version 75.
- Does the vendor list load fast enough without a mirror? Decide when Vendor is built.
- Which QBO account types count as expense accounts for the mapping dropdown, and which accounts are the credit card accounts?
- Naming convention for new vendors (for example `Amazon` rather than `AMAZON MKTPL*...`).
- Initial wording for skip reasons in the UI.
- More redacted samples: a Capital One return or fee, a Chase fee or adjustment, and a larger export from each bank to tune `merchantKey` normalization.
- Log retention and log viewer access (see Logging).
- Support contact on the connection page (see `qboQuestionnaire.md`).

## Where to Pick Up

1. Run `npx tsc --noEmit` (the connection type and model changed, and a reducer key was added).
2. Open `/sandbox/qboTest` as an `office` or `admin` user while the connection is live. The Accounts tab should list the chart of accounts. Fix whatever the first real response shows (query syntax, enum values, classification), then clear the `UNVERIFIED` markers and the matching Open Question.
3. Finish Phase B: the `companyinfo` smoke test on the connection page, then the per-call log, then offer tests for the pure helpers (`qboTokenUtils`, `qboHttpUtils`, `qboAccountUtils`).
4. Phase C: ask the user to paste Intuit's Vendor page and follow "Adding a QBO entity" above.