# QBO Integration: Plan

This is the single working plan for the QuickBooks Online (QBO) integration. It states the strategy, the decisions that matter, and the phases with their rationale. It deliberately avoids file-level detail: the code, the skills in `.claude/skills/`, and the readmes govern that.

**Agents: ignore `planning/archive/` unless the user asks you to look into it.** It holds the original phase docs (`qboPhase0.md` to `qboPhase7.md`). They are superseded by this file and parts of them are wrong now (sandbox assumptions, the Raw/Core/Doc type pipeline, the mirror). Do not follow them.

Other files in this folder:
- `sampleData/`: redacted Capital One and Chase CSV exports.

## Goal

Replace one-at-a-time expense entry in QBO with a fast monthly flow: import credit card CSV exports, map each merchant to a QBO vendor and expense account (mappings are remembered), then post the month's expenses to QBO in batches. Target: about 2 hours down to about 10 minutes.

Non-goals: this is not a QBO suite. No classes, locations, bank feeds, refund or credit handling, or editing and voiding of posted transactions. One company only (single realm).

## Working Agreements

- **Live data from the start.** We skipped the sandbox. The production Client ID and Secret are in use, and the connection works in dev and production.
- **Read before write (the write phase has started).** Until then we only attempted reads against the real books. The user said the write phase started when staged write 1 began. Writes now exist, but only for posting one credit card expense at a time, and only an admin can post. Do not widen that (more rows per post, more roles, vendor creation, updates, deletes) without the user asking for it.
- **First writes are staged.** See Phase E.
- **Dev and production share one MongoDB, one token document and one encryption key.** A token refresh from either environment rotates the token for both. `QBO_TOKEN_ENCRYPTION_KEY` must be identical in `.env.local` and Vercel Production.
- **Questionnaire answers are commitments.** The questionnaire file is gone and no longer needed, but the behaviors promised in this plan (token encryption, logging, error handling) still stand.

## Key Decisions

### Transactions
- Entity: QBO `Purchase` with `PaymentType: "CreditCard"`. `AccountRef` is the credit card account, `EntityRef` is the vendor, with one `AccountBasedExpenseLineDetail` line (the expense account). The optional memo goes in the purchase's `PrivateNote`, which Intuit documents as the Memo field on the Expense form. (An earlier version of this plan used the line `Description`.)
- `TxnDate` is the transaction date, not the posted date. The Chase `Memo` column is ignored; the user may type a memo on any row.

### Types (decided: no remap pipeline)
- QBO entities use **Intuit's own type definitions and PascalCase names** (`DisplayName`, `SyncToken`, `AccountRef`). We do not use the `Raw` / `Core` / `Doc` / `Props` layering from RealGreen, and we do not write `remap*` functions. We are not extending these types, and Intuit's shapes are stable (we pin `minorversion`). This intentionally deviates from the type-suffix table in `AGENTS.md`. Do not "fix" it.
- **Write out every field Intuit documents, and comment out the ones we do not use.** That keeps the full surface visible in the code, so nobody has to dig through Intuit's documentation again if requirements change. Fields we read, write, or must echo back (such as `Id` and `SyncToken`) stay uncommented.
- Types for our own data (import rows, mappings, card assignments, the token store) also skip the `Doc` / `Props` layering. One plain type per stored shape, named for what it holds. The whole `src/app/qbo/` module is exempt from the type-suffix table in `AGENTS.md`.
- **Selector architecture:** slices hold raw data, `*Select.ts` files do all merging and transforms, and components read with `useSelector` rather than prop drilling. A component or page that merges several slices may have its own selector file (for example `importCCTxnSelect.ts`).
- Types are built from definitions the user pastes from Intuit's API reference (it is rendered by JavaScript, so it cannot be fetched). The index of available pages, with build status, is `../typeReferences/availableReferences.md`. The pinned `minorversion` is 75 (`qboConst.minorVersion`), confirmed by the user as the version the reference pages were on.
- Shapes Intuit names without defining (addresses, phone, email, website, name-value pairs, months) were written from sample JSON into `_lib/types/QboContactTypes.ts`. Intuit has no page for `Line` either, so `QboPurchaseLine` also comes from samples.

### Loading reference data (decided: no mirror, revisit if needed)
- Vendors and accounts are loaded from the QBO API each session, the way RealGreen loads things like tax codes, and held in the Redux slice. No Mongo mirror and no sync job.
- When we create an entity (for example a vendor), we update slice state optimistically so the session stays in sync.
- Rationale: one company, so API quota is not a concern, and the loads are cheap. A mirror adds a sync job, staleness and a second source of truth.
- Vendors are the likely pressure point (there are many). If load time proves painful, add a mirror then. The slice and selector shapes should not need to change.
- Consequence: the posting pre-flight check (vendor and account still active) runs against the session's loaded data, and a fault from QBO is the final authority.
- **Privacy: the Vendor type stays faithful to Intuit, but the server loader sends the browser only what the mapping screen needs** (`Id`, `SyncToken`, `DisplayName`, `Active`, `CompanyName`). A Vendor response also carries addresses, phone numbers, emails, the masked `TaxIdentifier` and `Balance`, and none of that belongs in the Redux store. The same rule applies to CompanyInfo (its `EmployerId` is the company's EIN) and Preferences: only chosen summary fields reach the browser.

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
- **Built (`src/app/qbo/apiLog/`).** `qboHttp` records every attempt (retries after a 401 or 429 included, since each has its own `intuit_tid`). The three OAuth calls record themselves. `createQboRpcHandler` wraps each op in `withQboApiLog`, and the OAuth callback route opens the bracket itself. A call made outside any bracket is written immediately.
- **Retention (confirmed):** 90 days for successes, 365 days for failures and network errors, set per record in `expireAt`. This is the one `Date` field in the module, because Mongo's TTL index needs a real Date. Fault text is truncated and passed through `redact`; request and response bodies and headers are never stored.
- Viewer access (admin only) is still unconfirmed. The viewer itself is Phase F.

### Import behavior
- **Every CSV row is persisted with a status**, including skipped rows. A transaction that appears in a CSV must be logged. Statuses: `pending`, `skipped`, `posting`, `posted`, `failed`, `unknown`.
- **Formats:** hardcoded in code as they come up; there is no runtime format designer. Each format has a literal `formatId` (for example `chase`), which is the stored identity, and declares its exact header columns. Detection is an exact match of the file's header columns (trimmed, case-sensitive, order ignored). If the header is close to a known format but differs, the import is rejected with a message like "This looks like a Chase import, but the columns have changed" listing added and missing columns. A wholly unknown header is rejected listing the columns seen. Every parse problem is surfaced to the user, with row numbers; an import is all-or-nothing. One bad row fails the whole file on purpose: the banks only send good rows, so a bad one suggests the file was altered.
- **Format to account:** each format maps to one or more QBO credit card accounts (one flagged default). A card assignment may carry an optional account override. Resolution: card override, then the format default.
- **Page:** `/qbo/importCCTxn`. Expense accounts are `Classification === "Expense"`; credit card accounts are `AccountType === "Credit Card"`.
- **Card assignment:** keyed by `(formatId, last4)`. Import is blocked until every last4 in the file is assigned to a responsible site user, with an optional cardholder name.
- **Merchant mapping:** `merchantKey` (the full description, uppercased with whitespace collapsed; no suffix stripping, so distinct merchants never share a mapping by accident) maps to a vendor, a default expense account, and a growing list of other accounts. Mapping docs carry an owner-scope field (null = everyone) so per-user rules can be added later. Per-user mapping is not built now, but nothing should preclude it. Looser matching is for suggestions only: a loose form of the description (store numbers and reference codes dropped) ranks likely vendors and accounts at the top of the dropdowns, highlighted, and they also stay in their natural place in the list. A suggestion is never applied automatically. The loose rules are tuned against real data.
- **Skips:** reasons are defined in code. Payments and refunds are skipped automatically and never posted. `inventoryPurchase` is a manual skip, with an optional "always skip this merchant" rule. Refunds are handled by the user via journal entry in QBO.
- **Classification:** Chase `Type` of `Sale` is postable, `Payment` is a payment skip, `Return` is a refund skip, and anything else stops the import with an error naming the type. Capital One: Debit is postable, Credit with category `Payment/Credit` is a payment, any other Credit is a refund. More export samples would confirm this.
- **Duplicates:** neither bank gives a transaction ID, so identity is a hash of minimal row columns scoped by `formatId`. Identical rows in one file are handled by multiplicity (the file holds M, the database holds N, so M-N are new). A soft "possible duplicate" flag (same card, amount and date as a stored row, but different description or post date) asks the user to confirm and never blocks. It compares new rows against stored rows only, never rows against each other within one file: every row in a file is a posted transaction from the card company, even if it looks like a duplicate.
- **Access:** `office` and `admin` may import, enforced in API handler `roles`. Connection management is `admin`.

### Posting behavior
- Batches of up to 30 items, at most 40 batch requests per minute per realm. Items are independent and execution order must not be assumed, so a vendor must be created before the purchases that use it, not in the same batch.
- Results are matched by `bId` (our row ID). Partial success is expected and reported per row.
- `DocNumber` (shown as Ref no. on the QBO expense form) holds a short marker derived from the row hash (max 21 chars). It is how we find our own transactions again. **Built, and the first live write confirmed it (staged write 1):** the marker is `SG` + the first 12 hex characters of the stored row hash + `-` + the occurrence, for example `SGdec8e4a35041-1`. It is built from the stored row, so a retry resends the same value. QuickBooks kept it as typed and it shows as Ref no. on the expense form, even though the company's `VendorAndPurchasesPrefs.UseCustomTxnNumbers` is false: that setting did not stop an explicit value. A purchase can be found by exact `DocNumber` (`DocNumber = '...'` query, tried live on a hand-entered one). Permit no. is not an option: the API returned `CustomField` as null. What Intuit's pages said before we tested:
  - For Cash and CreditCard purchases a duplicate `DocNumber` is rejected (error 6140) unless the URI carries `include=allowduplicatedocnum`. Identical rows in one file would therefore collide, so the marker has a per-row-occurrence part. **UNTESTED:** whether QuickBooks really rejects a repeated marker with 6140 for this company. We never send `allowduplicatedocnum`.
  - Whether a custom `DocNumber` is honored at all depends on a company preference. The Purchase page names `VendorAndPurchasesPrefs.UseCustomTxnNumbers`, the errors page names `SalesFormsPrefs.CustomTxnNumbers`, and the Preferences sample on Intuit's page shows only the second. Resolved by the live read: Preferences list `VendorAndPurchasesPrefs.UseCustomTxnNumbers` as false, and an explicit value was still kept.
  - Design (built): a deterministic marker (prefix, a fragment of the row hash, and the occurrence number), re-derivable from the row, so a retry after an `unknown` outcome is rejected by QuickBooks as a duplicate if the first attempt actually landed.
- Pre-flight warning, worth building: Preferences carries `AccountingInfoPrefs.BookCloseDate` (live value 2023-12-31), so we can warn before posting a purchase dated on or before it. Whether QuickBooks actually refuses such a purchase (error 6210) is not proven, and Intuit's errors page says the API cannot tell you whether books are closed. The warning is cheap, and the 6210 whole-batch stop stays as the real safeguard.
- A timeout or network error after sending leaves the outcome unknown. Mark rows `unknown`, not `failed`, and reconcile by querying for the `DocNumber` markers before any retry.
- Validation faults are per row: the row is `failed`, shows the message, and stays editable and retryable. Error 610 does not say which reference is inactive, so re-load vendors and accounts and ask the user to re-pick. A duplicate vendor name (error 6240) offers to map to the existing vendor instead.
- Error codes from Intuit's errors page, and what each means for posting:
  - **Per row:** 610 and 2500 (a reference is inactive; 610 can also mean a deleted transaction), 6240 (duplicate vendor name), 6140 (duplicate `DocNumber`), 2020 (a required field such as `Line` is missing), 6000 (business validation).
  - **Stops the whole batch, because every row would fail the same way:** 6210 (account period closed), 6190 (subscription ended or billing problem), 120 (authorization failure). Rows stay `pending`.
  - **Not expected, because we never update:** 5010 (stale `SyncToken`). Seeing it would mean a bug.
  - **Never retried:** a 500 "Unsupported Operation" means non-UTF-8 characters in the payload, which is a bug to fix rather than retry.
- A batch item that fails carries a `Fault` with no top-level `time`. The success body of a create or update item is not on Intuit's Batch page (see `UNVERIFIED` in `QboCommonTypes.ts`), so confirm it during staged write 1. The first live write was accepted by the code as a created purchase (an item carrying `Purchase` with an `Id`), but the raw body was not captured, and the row's final status was not checked. If the row shows `unknown` instead of `posted`, the shape differs: the row's message names the keys.
- Posted rows are locked in our app. Corrections happen in QBO.

## Phases

Each phase leaves the system in a useful, checkable state. The order moves from the safest layer outward.

### Phase A: Connect (done)
Intuit app and keys, OAuth, encrypted token store, connect, disconnect and status page, legal pages, logout page.
**Why first:** everything depends on a trustworthy, admin-controlled connection, and the questionnaire commitments about tokens and CSRF are verified here.

Remaining odds and ends: the Intuit pricing tier and API call limits check, and the questionnaire support-contact question.

### Phase B: Reliable read layer and the first vertical slice
Build `qboHttp` (the single fetch chokepoint, modeled on `rgHttp`), `qboApi` (typed endpoint registry), and `createQboRpcHandler`. Add atomic refresh with `invalid_grant` handling, and the per-call log with `intuit_tid` capture. Prove it with a `companyinfo` smoke test on the connection page, then build **Account** end to end as the pattern-setting slice: types, contract, route, slice, thunks, hook, selectors, following the `data-module` skill and the RealGreen folder structure.
**Status:** token access with atomic refresh, `qboHttp`, `qboApi` (read endpoints at the time; `/batch` was added for posting in Phase E), `qboQuery`, `createQboRpcHandler` and the Account module with its `/sandbox/qboTest` tab are built. The Account load has run against live QuickBooks (285 accounts; query syntax, account types and classification confirmed). The smoke test ("Test connection" on the connection page, reading CompanyInfo and Preferences through their Read endpoints) and the per-call log (`apiLog/`) have run live: both Read responses had the assumed shape, and `qboapilogs` holds records with an `intuit_tid`, status, timing and a 90-day `expireAt` for the Accounts load and both smoke-test calls, with no sensitive data. The types for CompanyInfo, Preferences, Vendor, Purchase and the batch envelope are written (see `../typeReferences/availableReferences.md`). Not yet proven live: the token refresh path (it runs the first time a call is made after the access token expires, and the log will then show `oauthToken` records), and the failure and retry logging paths. Still to do: tests for `qboTokenUtils`, `qboHttpUtils` and `qboAccountUtils`.
**Why now:** failure handling, token refresh and logging are cheapest to get right while only reads are possible. Account is a read-heavy entity, so it establishes the pattern (query pagination, types written from Intuit's definitions, session-loaded slice) before we repeat it.

### Phase C: Remaining reference data
Vendor and Purchase read modules (both built and loaded live without problems), plus the batch envelope, `Line` and the `*Ref` types, built from pasted Intuit definitions using the Account pattern. Phase C is read-only: the `createVendor` write operation and posting are added in Phase E, but the Vendor slice is shaped so optimistic updates on create slot in without rework. Purchase differs from the other reference loads: it is loaded for a user-chosen date range (at most 366 days) because a company can hold years of purchases, and it replaces the held list on each load.
**Why separate:** with the pattern settled, these are mostly mechanical. Vendor is the highest-volume list, so it is where we find out whether the no-mirror decision holds.

### Phase D: CSV import and mapping (local only)
Format registry and parsers, card assignment, format-to-account mapping, merchant mapping, skips, duplicate detection, persisted import rows, and the import page. Nothing is posted. Put logic in pure functions (parsers, normalization, hashing, classification, duplicate comparison) and offer tests for them.
**Status: built and used live.** The importer, card assignment, merchant mapping and the Import and Map tabs work on real files (a sample import stored 5 rows: 4 pending, 1 skipped). Gaps are listed in "Where to Pick Up".
**Why before writing:** it carries no risk to the books, and it can be checked on real files, including months already entered by hand. By the end, the posting phase is the only unknown left.

### Phase E: Writes: vendor creation and posting
Vendor creation (the `createVendor` contract op, thunk and optimistic slice update), then batch posting with per-row results, fault handling, `unknown` reconciliation, locking, and a results screen.
**Staged first writes (replaces sandbox rehearsal):**
1. Post one or two real rows. Verify them in the QBO UI: vendor, account, date, amount, memo, and the Ref no. marker. Delete them in QBO if needed.
2. Post a small file.
3. Post a full month and compare totals against the card statement.

Things to confirm during stage 1 because no sandbox is available: the shape of a successful `Purchase` inside `BatchItemResponse`, that `DocNumber` appears as Ref no. (this depends on a company preference, so read Preferences first), that a repeated `DocNumber` is rejected with error 6140 (Intuit says it is, unless `allowduplicatedocnum` is sent, so test it by deliberately sending the same marker twice and deleting both afterwards), that purchases can be found by `DocNumber` for reconciliation, and the real fault payloads. Several of these (syntax and validation faults, `intuit_tid` presence) can be exercised with harmless reads or deliberately bad requests earlier. The questionnaire answer "tested that the app handles API errors, including syntax and validation errors" must be true before production approval.
**Status: staged write 1 is done.** One real Anthropic charge (10/26/2026, $95.01, Discover card) was posted through the Post tab and appears in QuickBooks as Expense `#SGdec8e4a35041-1` with the right vendor, card account, expense account, date and amount, and the marker as Ref no. Built: marker, payload builder, pre-flight check against live QuickBooks data, the confirmation dialog, atomic claim of a row before sending, outcome rules (`posted`, `failed`, `unknown`, back to `pending`), reconcile by Ref no., and the Settings tab for card accounts. Posting is admin only and one row per request (`MAX_ROWS_PER_POST`). Vendor creation is not built. Stages 2 and 3 are not done.
**Why last:** writes to real books are the only irreversible-ish step, so they come after the connection, the read layer and the import flow are proven.

### Phase F: Hardening and operations
Refresh-token expiry warning on the status page (verify the current maximum lifetime in Intuit's docs), the revoked-grant experience ("reconnect required", posting disabled, rows stay `pending`), the `/qbo/log` viewer with `intuit_tid` search and a copy-for-support button, a short runbook (reconnect, re-load data, handling `failed` and `unknown` rows, finding a call by `intuit_tid`).
**Why last:** these protect an app that already works. The viewer and warning matter once the thing is in regular monthly use.

## Folder Layout (target)

Mirror the RealGreen folder structure (`types/`, `api/` with contract and route, slice, select, `useX` hook), minus the Raw/Core/Doc layering and mirror models.

```
src/app/qbo/
  planning/             this plan, sampleData/, archive/
  _lib/api/             qboHttp.ts, qboApi.ts, createQboRpcHandler.ts
  apiLog/               QboApiLog types, model (per-outcome TTL), pure utils (redact, retention), server capture
  _lib/auth/            token crypto and refresh helpers (pure where possible)
  connection/           token model, connect/callback/status/disconnect, admin page
  account/              Intuit Account types, contract, route, slice, select, hook
  vendor/               Intuit Vendor types, contract (read now, create in Phase E), slice, select, hook
  importCCTxn/          route /qbo/importCCTxn, tabs Import, Map, Post, Settings
    types/ models/      import row and mapping types and models (plain types, no Doc/Props)
    _lib/               parsers and formats, hashing, duplicates, merchant key, mapping and suggestion
                        utils, row planning, posting utils, outcome rules, server posting (the only
                        code that writes to QuickBooks is importPostServer.ts)
    api/                mapping contract and route (formats, cards, merchants, skip rules, users)
    rows/               import rows: contract, route, slice, select, hook
    post/               posting: contract, route (admin only), slice, select, hook
    _components/        panels and rows for the four tabs
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

- Verified on the first live Account load (285 accounts): the `Active IN (true, false)` query syntax works and returns inactive accounts, every `AccountType` was recognized, and classification behaved as expected. Still to decide: whether `Classification === "Expense"` (which includes Cost of Goods Sold and Other Expense) is the right set for the mapping dropdown. Minor version 75 is confirmed and pinned.
- Verified live: the CompanyInfo and Preferences Read responses are `{ CompanyInfo: {...} }` and `{ Preferences: {...} }`, and `BookCloseDate` is present (2023-12-31).
- Verified live: the `TxnDate >= '...' AND TxnDate <= '...'` query syntax used by the Purchase loader, and both the Vendor and Purchase tabs load.
- `UNVERIFIED` until a live read or write: whether QuickBooks refuses a purchase dated on or before `BookCloseDate`; that a repeated marker is rejected with 6140; the raw success body of a batch create item (see "Posting behavior"); `QboMonth` beyond "January"; `BillableStatus` values beyond "NotBillable".
- Settled: the `DocNumber` marker design (see "Posting behavior").
- Does the vendor list load fast enough without a mirror? The Vendors tab loaded live with no problems reported, so the no-mirror decision stands. The vendor count and load time were not recorded; the `getAll` records in `qboapilogs` hold the per-page durations if we ever want them.
- Settled: expense accounts are `Classification === "Expense"`, and credit card accounts are `AccountType === "Credit Card"`.
- Naming convention for new vendors (for example `Amazon` rather than `AMAZON MKTPL*...`).
- Initial wording for skip reasons in the UI.
- More redacted samples: a Capital One return or fee, a Chase fee or adjustment, and a larger export from each bank to tune `merchantKey` normalization.
- Log viewer access (see Logging). Retention is settled.
- Support contact on the connection page.

## Where to Pick Up

**Where things stand:** Phases A to D are built and have run live. Phase E is at the end of staged write 1: one real Anthropic charge was posted from the Post tab and shows in QuickBooks as Expense `#SGdec8e4a35041-1` with the marker as its Ref no. Posting is admin only and one row per request. Stages 2 and 3 (a small file, then a full month), vendor creation and Phase F are not started. Nothing has been tested with automated tests since Phase B, and `tsc` has not been run since the Phase C work. The four tabs of `/qbo/importCCTxn` are Import, Map, Post and Settings.

1. **Run `npx tsc --noEmit`, then `npx vitest run src/__tests__/qbo` (121 tests passed at last run).** `tsc` has not been run since the Phase C work. Since then these changed: `QboApiPath` (added `/batch`), the Preferences summary and connection result type, the connection contract and slice, the `ImportRow` type and model, `NavMenu`, and the reducer map (new keys `importCCTxnMapping`, `importRow`, `importPost`).
2. **Finish staged write 1.** Check the state of the posted row (it should be `posted` with a QuickBooks Id; if it says `unknown`, the batch success body has a different shape than assumed and the row's message names the keys). Then, on the connection page, look the marker `SGdec8e4a35041-1` up with the Ref no. lookup card and keep the raw result. Then, only when the user says so, test the duplicate rule: post the same marker a second time and see whether QuickBooks rejects it (error 6140). If it does not, that creates a second real entry, so delete it in QuickBooks. Also delete the hand-entered `TEST` expense (Id 25997). Record the results here and clear the matching `UNVERIFIED` notes in `QboCommonTypes.ts` and `importPostOutcomeUtils.ts`.
3. **Write tests for the money-critical logic (none written yet).** In order of risk: the outcome rules in `importPostOutcomeUtils.ts` (a wrong `failed` can double-post: network errors and 5xx must be `unknown`, only certain faults `failed`, 6210/6190/120 back to `pending`); `checkDuplicates` including the overlapping-file case (8/1 to 8/15, then 8/13 to 8/31, identical rows, a partly present day); `checkRowReadyToPost` and `buildPurchaseCreate` (amounts in cents, marker length at most 21); the two bank formats and `detectImportFormat` using the sample CSVs (changed-columns message, a UTF-8 BOM on the first header, wrong row numbers in parse errors); the money and date parsers. Read `src/__tests__/testing.readme.md` first. Merchant-key suggestion rules should wait for real vendor and merchant data.
4. **Staged write 2: post a small file.** `MAX_ROWS_PER_POST` in `importPostServer.ts` is 1, on purpose. Raising it needs real batch posting: up to 30 items per `/batch` request and 40 requests a minute, results matched by `bId`, partial success reported per row, and a stop for the whole-batch errors (6210, 6190, 120). The outcome rules already handle one item, so extend them to many. Add a "post all ready rows" action with a confirmation that shows the count and total, and keep posting admin only. Then stage 3: a full month, compared against the card statement.
5. **Known gaps in what is built:**
   - **Skip controls.** The `setRowSkip` op and the `SkipRule` storage exist, but no screen uses them: there is no way yet to mark a row as an inventory purchase or to add an "always skip this merchant" rule.
   - **Vendor creation.** Not built (`createVendor`, an optimistic slice update, and the duplicate-name 6240 flow). A merchant whose vendor is not in QuickBooks yet cannot be mapped.
   - **No history view.** Posted rows leave the open-row list, so there is nowhere to see what was posted. The open-row load also fetches every skipped row, so it will grow. A history tab and a date window are the fix.
   - **No page-level role guard.** `proxy.ts` only checks that a user is logged in. The API ops enforce roles and the nav entry is hidden, but a non-admin who types `/qbo/importCCTxn/post` sees the page with failing calls. The Post panel does show an "Admins only" notice.
   - **Temporary diagnostic.** The Ref no. lookup card on the connection page (`QboDocNumberInspector`, op `inspectDocNumber`) was added to settle the marker design. Remove it once step 2 is done.
   - **Suggestion rules are a first guess** and need tuning against the real vendor list.
   - **Unproven live:** the token refresh path (it runs the first time a call is made after the access token expires; then check `qboapilogs` for `oauthToken` records and a retried call), and the failure and retry logging paths. Not proven: whether QuickBooks refuses a purchase dated on or before the books-closed date (2023-12-31); the pre-flight only warns.
6. **Then Phase F** (see above): refresh-token expiry warning, the revoked-grant experience, the `/qbo/log` viewer, and a short runbook for `failed` and `unknown` rows.