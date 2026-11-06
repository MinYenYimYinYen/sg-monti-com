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
- **Read before write (the write phase has started).** Until then we only attempted reads against the real books. The first live write (one credit card expense) worked and was verified in QuickBooks. The user then decided to skip the small-file stage and post a full month next. Writes are allowed for posting credit card expenses (in batches), for creating vendors, and (added 2026-11-06 at the user's request) for creating journal entries, and only an admin can do any of them. Do not widen that (more roles, vendor updates, deleting or editing posted transactions) without the user asking for it.
- **No deliberate duplicate test.** The user dropped the plan to send the same Ref no. twice to see QuickBooks reject it (error 6140). Our own duplicate check and the atomic row claim already stop a posted row from being sent again, and a deliberate test would create a second real entry. The 6140 rule stays untested and is treated as a backstop only.
- **No default expense account on vendors.** QuickBooks has a "default expense category" on a vendor, but Intuit's Vendor page does not document it, so we do not read or write it. Our merchant mapping already remembers the default and other accounts used per merchant, which covers the same need inside this app.
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
- The `/sandbox/qboTest` tab page (Accounts, Vendors, Purchases) was used to eyeball live entities and has been deleted. Entities are now seen through the import pages (`/qbo/importCCTxn`). The Purchase module (slice, selectors, `useQboPurchase`, route and loader) stays in place, with no screen using it yet, because planned features such as a history or reconcile view will need it.

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
- A batch item that fails carries a `Fault` with no top-level `time`. The success body of a create item is not on Intuit's Batch page, but the first live write confirmed it: the item carries the `Purchase` with its `Id` next to the `bId`, and the row went to `posted`. Updates and deletes are not verified (we never send them). Anything unexpected is still `unknown`, never `posted`.
- Posted rows are locked in our app. Corrections happen in QBO.

## Phases

Each phase leaves the system in a useful, checkable state. The order moves from the safest layer outward.

### Phase A: Connect (done)
Intuit app and keys, OAuth, encrypted token store, connect, disconnect and status page, legal pages, logout page.
**Why first:** everything depends on a trustworthy, admin-controlled connection, and the questionnaire commitments about tokens and CSRF are verified here.

Remaining odds and ends: the Intuit pricing tier and API call limits check, and the questionnaire support-contact question.

### Phase B: Reliable read layer and the first vertical slice
Build `qboHttp` (the single fetch chokepoint, modeled on `rgHttp`), `qboApi` (typed endpoint registry), and `createQboRpcHandler`. Add atomic refresh with `invalid_grant` handling, and the per-call log with `intuit_tid` capture. Prove it with a `companyinfo` smoke test on the connection page, then build **Account** end to end as the pattern-setting slice: types, contract, route, slice, thunks, hook, selectors, following the `data-module` skill and the RealGreen folder structure.
**Status:** token access with atomic refresh, `qboHttp`, `qboApi` (read endpoints at the time; `/batch` was added for posting in Phase E), `qboQuery`, `createQboRpcHandler` and the Account module are built. The Account load has run against live QuickBooks (285 accounts; query syntax, account types and classification confirmed). The smoke test ("Test connection" on the connection page, reading CompanyInfo and Preferences through their Read endpoints) and the per-call log (`apiLog/`) have run live: both Read responses had the assumed shape, and `qboapilogs` holds records with an `intuit_tid`, status, timing and a 90-day `expireAt` for the Accounts load and both smoke-test calls, with no sensitive data. The types for CompanyInfo, Preferences, Vendor, Purchase and the batch envelope are written (see `../typeReferences/availableReferences.md`). Not yet proven live: the token refresh path (it runs the first time a call is made after the access token expires, and the log will then show `oauthToken` records), and the failure and retry logging paths. Still to do: tests for `qboTokenUtils`, `qboHttpUtils` and `qboAccountUtils`.
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
**Rollout (decided):** the first live write is done and verified. The user skipped the small-file stage, so the next step is a full month, compared against the card statement. There is no sandbox, so the first multi-row batch runs against the live books. Because of that, batch posting stops after the first batch that has any row not `posted`, and rows are chosen by an explicit date range with a confirmation showing the count and total.
**Verified by the first live write:** a created purchase comes back as an item carrying the `Purchase` and its `Id`; `DocNumber` shows as Ref no. and is kept as sent; a purchase can be found by exact `DocNumber`; a re-import of the same CSV row is caught by our duplicate check. **Not tested, on purpose:** that QuickBooks rejects a repeated marker (error 6140). The questionnaire answer "tested that the app handles API errors, including syntax and validation errors" must still be true before production approval.
**Status:** the first live write is done. One real Anthropic charge (10/26/2026, $95.01) was posted through the Post tab and appears in QuickBooks as Expense `#SGdec8e4a35041-1` with the right vendor, card account, expense account, date and amount, and the marker as Ref no. Built: marker, payload builder, pre-flight check against live QuickBooks data, the confirmation dialog, atomic claim of a row before sending, outcome rules (`posted`, `failed`, `unknown`, back to `pending`), reconcile by Ref no., and the Settings tab for card accounts. Tests for the outcome rules, duplicates, posting checks and payload, value parsers and both bank formats were added (347 QBO tests pass). Batch posting, vendor creation, skip controls, the account override and the normalized merchant key were built afterwards (see "Where to Pick Up"). Posting is admin only.

**Vendor creation (decided).** A vendor is created when the user defines it, with an explicit "New vendor" action on the Map tab, not when the month is submitted. Reasons: `MerchantMapping.vendorId` is required, so deferring would need a "pending vendor" state through mappings, checks and suggestions; a duplicate-name fault (6240) shows up while mapping one merchant, where "use the existing vendor" is a natural answer; the rule that a vendor must exist before the purchases that use it holds automatically; and `DisplayName` is unique, so a retry after a timeout cannot create a second vendor. The cost is that a typo creates a real vendor that this app cannot delete, so the dialog prefills a cleaned name, shows exactly what will be created, checks the name against the loaded vendors case-insensitively first, and creation is admin only. We send only `DisplayName`: Intuit's Vendor page documents no default expense account, so there is none to set.
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
    decisions/          the Map tab's unsaved draft: slice, select, hook, and the saveDecisions
                        contract and route (office and admin, our own data only)
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
- Verified live by the first write: the success body of a batch create item (a `Purchase` with its `Id` next to the `bId`).
- `UNVERIFIED` until a live read or write: whether QuickBooks refuses a purchase dated on or before `BookCloseDate`; that a repeated marker is rejected with 6140 (deliberately not tested, see Working Agreements). Settled from Intuit's documentation, no longer unverified: `QboMonth` is the calendar month names, and `BillableStatus` is `Billable`, `NotBillable` or `HasBeenBilled`. The vendor-name check compares names in memory against the loaded vendors, so an apostrophe never reaches a query.
- Vendor `DisplayName` must be unique across customers, employees and vendors, but we load only vendors, so a clash with a customer or employee shows up as a 6240 fault on create. The user would then pick another name.
- Settled: the `DocNumber` marker design (see "Posting behavior").
- Does the vendor list load fast enough without a mirror? The Vendors tab loaded live with no problems reported, so the no-mirror decision stands. The vendor count and load time were not recorded; the `getAll` records in `qboapilogs` hold the per-page durations if we ever want them.
- Settled: expense accounts are `Classification === "Expense"`, and credit card accounts are `AccountType === "Credit Card"`.
- Naming convention for new vendors (for example `Amazon` rather than `AMAZON MKTPL*...`).
- Initial wording for skip reasons in the UI.
- More redacted samples: a Capital One return or fee, a Chase fee or adjustment, and a larger export from each bank to tune `merchantKey` normalization.
- Log viewer access (see Logging). Retention is settled.
- Support contact on the connection page.

## Where to Pick Up

**Where things stand:** Phases A to D are built and have run live. In Phase E, the first live write is done and verified: one real Anthropic charge was posted from the Post tab and shows in QuickBooks as Expense `#SGdec8e4a35041-1` with the marker as its Ref no. The diagnostic Ref no. lookup was removed, and `/sandbox/qboTest` was deleted by the user. The money-critical logic now has tests (347 QBO tests pass). Posting is admin only, in batches of 30. Vendor creation, skip controls, the account override, the normalized merchant key and batch posting are built but none has been tried live yet, and Phase F is not started. The four tabs of `/qbo/importCCTxn` are Import, Map, Post and Settings.

1. **Run `npx tsc --noEmit`, then `npx vitest run src/__tests__/qbo`.** `tsc` has not been run since the Phase C work. Since then these changed: `QboApiPath` (added `/batch`), the Preferences summary and connection result type, the connection contract and slice (the diagnostic op and state were removed), the `ImportRow` type and model, `NavMenu`, `buildDocNumberWhere` (moved into `qboPurchaseUtils.ts`), the new test files, and the reducer map (new keys `importCCTxnMapping`, `importRow`, `importPost`).
2. **Batch posting for a full month: built, not yet tried live.** The "Post a date range" card on the Post tab (`DateRangePicker`) asks the server what a range would send (`previewBatch`, admin only, writes nothing), and a confirmation dialog shows the count, the total, the number of batches, the rows that will not be posted and why, books-closed warnings, and how many rows have an unconfirmed description (counted, never blocked). "Post N expenses" sends exactly the rows the preview listed as ready (`postRows`). The server (`importPostServer.ts`, still the only code that writes purchases) loads the mappings, card assignments, format accounts, every vendor, every account and the preferences once per run (`loadPostContext`), checks every row against that (`planPostRows`), claims each row atomically (pending or failed to posting), sends batches of 30 (`ROWS_PER_BATCH`), matches results by `bId`, and records each row's own outcome. A row that was not sent is reported as blocked, never dropped. **The run stops after the first batch in which any sent row is not `posted`**, and the rest stay as they were (`notAttemptedRowIds`, with a plain-language `stopReason`). A request that dies leaves its rows `unknown`. One run takes at most 300 rows (10 batches); `maxDuration = 300` is set on the route, and one batch request has a 60 second timeout (`batchRequestTimeoutMs`). `PostRunResults` accounts for every row (posted with a total in dollars, failed, check in QuickBooks, sent back unposted, not sent, held back). Row lookup by Ref no. (`reconcileRow`) moved to `importReconcileServer.ts`, and a row stuck in `posting` can now be looked up too, but only after 10 minutes, since a younger one may still be in flight. Not yet proven live: the first real multi-row batch (the shape of a multi-item response, a partial failure, and the 40 requests a minute limit, which a 300-row run, at most 10 requests, does not approach). Do the first run on a small range if possible, check the QuickBooks total against the statement, and look at the `qboapilogs` records for the batch calls.
3. **Vendor creation: built, not yet tried live.** Admin only. `createVendor` op (`/vendor` endpoint in `qboApi.ts`), `qboVendorCreateServer.ts`, slice status (`vendorCreateStatus`, `vendorCreateResult`), and `NewVendorDialog` opened by the `+` button in `MapRowVendorPicker`; "Use this vendor" picks it for that row, which maps its family. The name field starts blank on purpose. Tested: name rules, case-insensitive match, fault classification (111 new tests in total with the date fix). Try it with a throwaway vendor name you are happy to keep, because this app cannot delete or rename a vendor.
4. **Mapping, skip and Map-tab design (decided with the user; condensed on 2026-11-05, the code is the detail):**
   1. **Skip controls and Settings: built, not yet tried live.** A row is skipped from the Map tab (per row, saved with Save; its "Always?" tick then stores a skip rule for the merchant family, see 4.4) or from the Post tab (per-row Skip, pending rows only, reason `inventoryPurchase`). Saving a skip rule also skips that merchant's pending rows (`skipPendingRowsForMerchant`, pending only, so a row being posted is never touched), and the browser applies the same rule to its own rows (`applySkipRuleToRows`). The Post tab lists restorable skips with a Restore button (payments and refunds are only counted). Settings has a "Skipped merchants" card to remove rules; removing a rule leaves rows already skipped as they are. Rules are keyed by the normalized merchant key. A merchant that sells both items and expenses (Amazon) should be skipped row by row, which is why "Always?" is only offered after a row is skipped.
   2. **Account override: built, not yet tried live.** `ImportRow.accountId` is the row's own expense account (absent means the merchant default; picking the default clears it). It is set from the Map tab (saved with Save, see 4.4) or from the Post tab (`RowAccountPicker`, `setRowAccount`, refused for a row that is posting). Posting uses the row's account over the default (`resolveRowAccountId`), and the pre-flight refuses an account that is not an expense. After a successful post the account joins the merchant's `otherAccountIds` (atomic `$addToSet`, `rememberPostedAccount`, never failing the post) and the browser reloads the mappings. `OtherAccountsIndicator` marks a stored default when the merchant has other accounts. The Map tab's batch save never writes `otherAccountIds`, so it cannot overwrite what a post added. The older `upsertMerchantMapping` op still writes the whole list from the caller's copy, but no screen calls it now.
   3. **Normalized merchant key and `confirmedMerchants`: built, not yet tried live.** `buildMerchantKey` (`importMerchantKey.ts`) is the one normalization function. Checked against the 24 real descriptions of the first import: 21 families, merging only `AMAZON MKTPL*<code>` and `KWIK TRIP #<n>`; `SQ *BLUE BOTTLE 1234` becomes `SQ *BLUE BOTTLE`. When unsure it splits rather than merges, because a wrong merge puts a wrong vendor on a row and a wrong split costs a click. No migration was needed (the mappings collection was empty). Open rows are re-keyed on load (`findRowsNeedingNewKey`) and the pre-flight derives the key from the description, so a stale stored key cannot pick the wrong mapping. `confirmedMerchants` holds the full descriptions a person has seen next to the vendor: saving the same vendor adds to it, a new vendor starts it over (`storeMerchantMapping`). The Map tab confirms through the draft (`InferredConfirmCheckbox`, saved with Save); the Post tab still confirms immediately (`ConfirmMerchantCheckbox`, `confirmMerchant`). Decided by the user: an unconfirmed row is never blocked from posting (review is the safeguard), and per-string confirmation stays. Known limits: about 1 in 19 random Amazon-style codes has no digit and becomes its own family (one extra click); the vendor highlight (`suggestVendorIds`) is a loose substring match ("Shell" highlights for "Shelley's") and never fills a vendor. Not built: a key version, a stored sample description and a re-normalizing migration. If the key rules change, `confirmedMerchants` has the descriptions needed to re-derive keys, and a change that merges families needs a read-only conflict report first.
   4. **Map tab: one row per transaction, one Save (built, not yet clicked through).** No merchant groups. Every pending row is listed, families side by side. The user's decisions live in a Redux draft (`decisions/importDecisionSlice.ts`) and nothing is sent until one **Save** (`saveDecisions`, office and admin, writes only our own collections, never QuickBooks). Save is disabled until every pending row is ready (a skipped row counts; a green check marks a ready row). The rules, all in pure functions (`_lib/importDecision*Utils.ts`) behind the selectors in `decisions/importDecisionSelect.ts`:
      - **A family (one `merchantKey`) has one effective mapping.** Vendor is `chosen ?? stored ?? inferred ?? none`, where a vendor picked this session replaces the stored one for the whole family (decided: option A, "mapping one maps all"). So the siblings of a changed family read as `inferred`: shaded `bg-secondary/10`, with a tick to confirm. A saved vendor whose exact description is not in `confirmedMerchants` gets the same tick. Inferred and unconfirmed rows never block Save.
      - **Accounts follow the same layering.** The first account picked in a family with no saved mapping becomes its default and the siblings show it as `inferred` at once; a later different pick is that row's own override. A stored default whose merchant has other accounts gets an outline and the compact `OtherAccountsIndicator`.
      - **Skip** is per row. After a skip an "Always?" tick (labelled with how many pending rows it covers) stores a skip rule for the family. Skipped rows make no vendor or account decisions.
      - **Save** applies mappings, then row accounts and skips, then skip rules (`importDecisionServer.ts`). A part the server refuses comes back in `failures` and stays in the draft; the rest is saved. `storeMerchantMapping` is shared with `upsertMerchantMapping`.
      - **Layout:** full width, a fixed-column grid from the `xl` breakpoint, `+` icon for New vendor (admin), the cardholder's first name and last initial above the description (typed `cardholderName` first, else the responsible user; `importCardSelect`, `CardholderLabel`).
      - **Limits:** a different vendor on one row changes the whole family (a row-only vendor needs `ImportRow.vendorId` and a change to both pre-flight paths, `assembleCheckInput` and `buildCheckInput`); the draft is lost on reload (no unsaved-changes guard yet); no tests yet for the `importDecision*` helpers or `formatCardholderLabel`.
   5. **The Post tab stays for now (decided).** Folding posting into the Map tab was analyzed and deferred. If it is revisited, these must come with it: failed rows need a home (the Map list is pending only, and `setRowSkip` refuses failed rows), unknown and stuck rows need "Look in QuickBooks", skipped rows need Restore, posting controls must be disabled while the draft has unsaved changes (the server posts stored data, not the draft), a green check does not mean postable (the card account and books-closed checks are server side), posting stays admin only, and the date-range step and `PostRunResults` need a place. The Post tab's per-row Skip, `RowAccountPicker` and `ConfirmMerchantCheckbox` still save immediately and overlap the Map tab.
5. **Known gaps in what is built:**
   - **Capital One dates.** Real Capital One exports use `YYYY-MM-DD`, not `MM/DD/YYYY` (found on the first real import; the original sample was wrong and has been corrected). Chase is still assumed to be `MM/DD/YYYY` until a real Chase file is imported.
   - **No history view.** Posted rows leave the open-row list, so there is nowhere to see what was posted. The open-row load also fetches every skipped row, so it will grow. A history tab and a date window are the fix.
   - **No page-level role guard.** `proxy.ts` only checks that a user is logged in. The API ops enforce roles and the nav entry is hidden, but a non-admin who types `/qbo/importCCTxn/post` sees the page with failing calls. The Post panel does show an "Admins only" notice.
   - **Suggestion rules are a first guess** and need tuning against the real vendor list.
   - **Unproven live:** the token refresh path (it runs the first time a call is made after the access token expires; then check `qboapilogs` for `oauthToken` records and a retried call), and the failure and retry logging paths. Not proven: whether QuickBooks refuses a purchase dated on or before the books-closed date (2023-12-31); the pre-flight only warns.
6. **Then Phase F** (see above): refresh-token expiry warning, the revoked-grant experience, the `/qbo/log` viewer, and a short runbook for `failed` and `unknown` rows.

## Progress Log

### Session of 2026-11-06 (JournalEntry module)

**Built, not yet run. `npx tsc --noEmit` has not been run, and nothing has been tested or tried against live QuickBooks.** The `journalEntry/` module writes one or more journal entries through `/batch`, with a stored posting per entry so an uncertain outcome can be settled.
- **Decisions (with the user):** `/batch` transport. `DocNumber` is required on every entry (it is how an outcome is verified). Admin only. No multicurrency, so `CurrencyRef` and `ExchangeRate` are never sent. Create only: update, delete and read-by-id are not built, and corrections happen in QuickBooks.
- **Stored posting:** `JournalEntryPosting` in Mongo (`models/JournalEntryPostingModel.ts`), one per `DocNumber` (unique index), amounts in cents. Status is `pending`, `posting`, `posted`, `failed` or `unknown`. `verifiedAt` is set only when a separate read by `DocNumber` found exactly that entry (same date, line count and total on both sides). `posted` alone means QuickBooks answered with an `Id`.
- **Flow** (`_lib/qboJournalEntryServer.ts`, `qboJournalEntryPreflightServer.ts`): validate, check accounts against fresh QuickBooks data (active; A/R needs a Customer, A/P needs a Vendor), refuse a `DocNumber` already in QuickBooks (it only rejects duplicates when `WarnDuplicateJournalNumber` is on), write ahead as pending, claim atomically, send batches of 30, stop after the first batch with any entry not posted. A thrown or timed out batch is `unknown`, never `failed`.
- **Reconcile** (`qboJournalEntryReconcileServer.ts`): looks entries up by `DocNumber`. One matching entry settles as posted and verified. None settles as `failed` (safe to retry, because the `DocNumber` is unique). Several, or a mismatch, stay `unknown`. A `posted` entry that cannot be confirmed keeps its status with a note and is never flipped to failed.
- **Operations** (all admin): `postMany`, `reconcile`, `getByDateRange`. Slice, selectors and `useQboJournalEntry` hold postings and the last post run. Registered as `qboJournalEntry` in `src/store/reducers/index.ts`. No screen uses the module yet.
- **UNVERIFIED, check on the first live run:** (1) the success body of a JournalEntry batch create (assumed to carry `JournalEntry` with `Id`, as Purchase did); anything else becomes `unknown`. (2) The `DocNumber IN (...)` query. (3) The 21-character `DocNumber` limit (`qboConst.journalEntryDocNumberMaxLength`), which is not on Intuit's page. (4) Whether a custom `DocNumber` is kept for journal entries, as it was for purchases.

### Session of 2026-11-05 (Map tab redesign, UI and state)

**Built, not yet run or clicked through. `npx tsc --noEmit` has not been run, and ESLint was the only check.** The design and rules are in "Where to Pick Up", item 4.4; this is what changed.
- **Map tab redesign:** the merchant groups are gone, replaced by a row per transaction with a Redux draft and one Save. New: `decisions/` (slice, selectors, `useImportDecision`, the `saveDecisions` contract and route), `types/ImportDecisionTypes.ts`, `_lib/importDecisionDraftUtils.ts`, `importDecisionFamilyUtils.ts`, `importDecisionViewUtils.ts`, `importDecisionSaveUtils.ts`, `importDecisionServer.ts`, `importMappingSaveServer.ts` (`storeMerchantMapping`, shared with `upsertMerchantMapping`), and the components `MapRowLine`, `MapRowVendorPicker`, `MapRowAccountPicker`, `InferredConfirmCheckbox`, `SkipAlwaysCheckbox`, `MapSaveBar`. `importCCTxnMappingSlice` and `importRowSlice` also handle `saveDecisions.fulfilled`; the reducer map gained `importDecision`.
- **Removed:** `MerchantMapRow`, `AlwaysSkipButton`, `importMapUtils.ts` (`pickActiveAccounts` moved to `importAccountUtils.ts`; the group selectors left `importMapSelect`).
- **Layout and cardholder pass:** `OptionPicker` takes an optional `className`, `OtherAccountsIndicator` an optional `isCompact`. New: `_lib/importCardholderUtils.ts`, `importCardSelect.ts`, `_components/CardholderLabel.tsx`.
- **Probably dead now:** `saveMerchantMapping` in `useImportCCTxnMapping` and the `upsertMerchantMapping` thunk have no caller. They are left in place; remove them in the single-purpose review if still unused.

### Session of 2026-11-05 (Phase E)

**State at the end of the session.** Everything below is built and its pure logic is tested: 575 QBO tests in 37 files pass (`node node_modules/vitest/vitest.mjs run src/__tests__/qbo`; plain `npx vitest` prints a Vite config warning to stderr that PowerShell reports as a failure). **None of it has been run against live QuickBooks or clicked through in a browser.** `npx tsc --noEmit` has not been run since the Phase C work, because the IDE diagnostics tool was unavailable and AGENTS.md says agents do not run `tsc`. Run it first next session: this session changed contracts, slice state, exports and signatures.

**Built, in order.**
1. **Tests** for the money-critical logic: outcome rules, duplicate detection, posting checks and payload, value parsers, both bank formats and the CSV parser (`src/__tests__/qbo/importCCTxn/`).
2. **Cleanup:** the Ref no. lookup card and its op were removed; `buildDocNumberWhere` moved to `qboPurchaseUtils.ts`; the user deleted `/sandbox/qboTest`; the Purchase module stays. Type notes settled: `QboMonth`, `BillableStatus`, expense classification.
3. **Capital One dates:** real exports use `YYYY-MM-DD`, so the format uses a strict `parseIsoDate`; the sample file was corrected. Chase is still assumed `MM/DD/YYYY`.
4. **Vendor creation** (admin only): `qboVendorCreateServer.ts`, `NewVendorDialog`, slice status, 37 tests.
5. **Skip controls:** per-row Skip, "Always skip" per merchant, skipped-rows list with Restore, "Skipped merchants" card in Settings.
6. **Account override:** `ImportRow.accountId`, `RowAccountPicker`, `OtherAccountsIndicator`, posted accounts join `otherAccountIds`.
7. **Normalized merchant key and `confirmedMerchants`:** `buildMerchantKey`, `importConfirmUtils.ts`, `importConfirmSelect.ts`, `ConfirmMerchantCheckbox`, `confirmMerchant` op.
8. **Batch posting:** `importBatchPlanUtils.ts`, `importBatchRunUtils.ts`, `importPostContextUtils.ts`, `importReconcileServer.ts`, `importRowSettleServer.ts`, a rewritten `importPostServer.ts`, `BatchPostCard`, `BatchConfirmDialog`, `PostRunResults`, `previewBatch` op, `maxDuration = 300` on the post route.

**Decisions made this session** (all recorded in the sections above): writes are allowed for batch posting and vendor creation, admin only; the deliberate 6140 duplicate test was dropped; vendors get no default expense account; a vendor is created when the user defines it; unconfirmed rows never block posting; the account joins `otherAccountIds` only after a successful post; mixed merchants such as Amazon are skipped row by row.

**Facts learned from real data.** The first real Capital One file had 28 rows (2026-09-28 to 2026-10-27). Its 24 distinct descriptions group into 21 families under the new key, merging only `AMAZON MKTPL*<code>` and `KWIK TRIP #<n>`. `qboimportmerchantmappings` was empty, so there was nothing to migrate. One row is posted: Anthropic, 2026-10-26, $95.01, Ref no. `SGdec8e4a35041-1`, QuickBooks Id 26050.

**Do next, in order.**
1. `npx tsc --noEmit`, fix what it finds, then run the QBO tests.
2. **First batch run on a small range** (3 to 5 days). Nothing has seen a multi-item `/batch` response yet. Compare the posted total with the card statement, spot-check a few expenses in QuickBooks, and read the batch records in `qboapilogs` (`intuit_tid`, status, timing).
3. Try, in the browser, the Map tab: pick a vendor and watch the same merchant's rows fill in and shade; pick an account the same way; skip a row and tick "Always?"; press Save and read any failures listed in the save bar; vendor creation with the `+` button (use a throwaway name; it cannot be deleted here). Then on the Post tab: the row account dropdown and the confirm checkbox.
4. Decide on tests for the `importDecision*` helpers and `formatCardholderLabel` (offered, not yet answered).
5. Phase F.
6. The size and single-purpose review below.

**Known limits.**
- About 1 in 19 random Amazon-style order codes has no digit and becomes its own family (one extra click, fails safe).
- The vendor picker highlight is still a loose substring match ("Shell" highlights for "Shelley's"). It never fills a vendor.
- There is no history view of posted rows, and no page-level role guard (the API enforces roles).
- `importPostServer.ts` (claim, send, record, stop) and the Mongo and QuickBooks loaders are not unit tested, by the testing readme's rule. Their rules live in the tested pure functions, but the sequencing is only read-checked.
- There are two implementations of the single-row pre-flight input: `buildCheckInput` (per-row queries, used by `previewPost`) and `assembleCheckInput` (from a loaded context, used by batches). They can drift apart.

### Oversized files: red flags for a single-purpose review

**What this list is.** The editor tool rejects a single write of more than about 6,000 characters, so any file that had to be written or edited in several pieces is a candidate for doing more than one thing. Nothing here is a verdict. It is a list of where to look. Sizes were measured at the end of the session (lines count non-blank lines only; characters are bytes on disk). The threshold I used (about 150 lines or 6,000 characters) is a rule of thumb, not a project standard.

**Files I could not write in one piece and had to split or write in parts.** These are the strongest signal, because the size was reached while writing, not by growing over time.

| File | Size when written | What I did |
|---|---|---|
| `_lib/importBatchUtils.ts` (never kept) | about 8,900 chars | Split into `importBatchPlanUtils.ts` (planning a range) and `importBatchRunUtils.ts` (sending and reading results). The split followed two real purposes. |
| `_lib/importPostServer.ts` | 211 lines, 8,225 chars | Rewritten in two parts. It holds claim, remember-account, send, claim-batch and the run loop. Candidate to split: account memory and claiming out of the run loop. |
| `_lib/importPostContextUtils.ts` | grew by three appends | Holds the context type, check-input assembly, run planning and preview candidates. Candidate to split: planning for a run versus candidates for a preview. |
| `_lib/importPostLookupServer.ts` | 191 lines, 8,994 chars | Appended to twice. It now holds row loading, the old per-row pre-flight, the batch context loader and the batch preview. Its header still says "reads only", which is true, but it is now four jobs. Largest source file in the importer. |

Test files that were rejected at 6,500 to 10,300 characters and written as several smaller files instead: `importPostOutcomeUtils` (split four ways by function), `importDuplicates` (two), `importPostUtils` (two), `importCsvParser` (two), `qboVendorUtils` (two), `importBatchPlanUtils` (three), `importPostContextUtils` (two, plus a shared helper). `importPostUtils.checkRow.test.ts` is now the largest test file (166 lines, 7,206 chars) and was only ever edited in pieces.

**Existing files that were too large to read or edit comfortably, or that grew a lot this session.** I had to read some of them by line range.

| File | Size now | Why it is a flag |
|---|---|---|
| `importCCTxn/api/route.ts` | 211 lines, 8,398 chars (re-measured after the Map redesign) | One route file handles format accounts, card assignments, assignable users, merchant mappings, confirmations and skip rules. Read by line range. Strongest single-purpose concern: six unrelated operations behind one `POST`. The mapping upsert moved out to `storeMerchantMapping`. |
| `importCCTxn/importCCTxnMappingSlice.ts` | 193 lines, 7,836 chars (re-measured) | One slice for five lists (assignable users, format accounts, card assignments, merchant mappings, skip rules) and every thunk for them. It also listens for the confirm op and for `saveDecisions`. |
| `importCCTxn/_components/NewVendorDialog.tsx` | 153 lines, 6,147 chars | Dialog, name check, existing-vendor handling and outcome display in one component. Lower concern: one purpose, long. |
| `importCCTxn/_lib/importRowAccessServer.ts` | 140 lines, 6,022 chars | Grew to hold the user lookup, open-row loading with re-keying, skip, account and bulk-skip operations. |
| `importCCTxn/_lib/importRowServer.ts` | 150 lines, 5,513 chars | Preview and commit of an import, not changed this session. Listed because it is near the threshold. |
| `_lib/auth/qboOAuthServer.ts`, `qboTokenServer.ts`, `qboOAuthUtils.ts`; `connection/_components/QboConnectionCard.tsx` | 233, 191, 190, 181 lines | Large, but not touched this session. Listed so the review covers the whole module. |
| `planning/qboPlan.md` | about 44,000 chars before this log was added | Read only through truncated search results many times. Two lines are 2,000 to 3,000 characters each (the batch posting and the account override notes). Candidate to split into a short plan and per-area notes. |

**Questions for the single-purpose review.**
- Should `importCCTxn/api/route.ts` and `importCCTxnMappingSlice.ts` be split by what they manage (card setup, merchant mapping, skip rules)? They are the two files every mapping change has to pass through.
- Should `importPostLookupServer.ts` be split into row and context loading, the single-row preview, and the batch preview, and should `buildCheckInput` be retired in favor of `assembleCheckInput` so there is one pre-flight path?
- Should `importPostServer.ts` keep claiming and account memory beside the run loop? (The rule "this is the only code that writes purchases" is worth keeping as the reason it stays one file.)