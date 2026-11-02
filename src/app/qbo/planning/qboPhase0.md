# QBO Integration - Phase 0: Overview, Architecture, Decisions

## Goal

Replace one-at-a-time expense entry in QuickBooks Online (QBO) with a fast monthly flow: import credit card CSV exports, map each merchant to a QBO vendor and expense account (mappings are remembered), then post the month's expenses to QBO in batches. Target: ~2 hours down to ~10 minutes.

Non-goals: this is NOT a QBO suite. No classes, no locations, no bank feeds (QBO does not and will not use them), no refund/credit handling, no editing or voiding of posted transactions.

## Phase Map

| Phase | Doc | Summary |
|---|---|---|
| 0 | `qboPhase0.md` | This overview and the decision log |
| 1 | `qboPhase1.md` | Intuit developer setup (user tasks) |
| 2 | `qboPhase2.md` | OAuth, token store, `qboHttp`, connection routes |
| 3 | `qboPhase3.md` | Reference data mirror (vendors, accounts) |
| 4 | `qboPhase4.md` | Inline vendor creation |
| 5 | `qboPhase5.md` | CSV import, formats, mappings, skips, duplicate detection |
| 6 | `qboPhase6.md` | Posting, row statuses, faults, locking |
| 7 | `qboPhase7.md` | Production cutover |

## Decision Log

### Transactions
- Entity: QBO `Purchase` with `PaymentType: "CreditCard"`. `AccountRef` = mapped credit card account, `EntityRef` = vendor, one `AccountBasedExpenseLineDetail` line = expense account + optional memo (line `Description`).
- Transaction date (not posted date) is the QBO `TxnDate`.
- Chase `Memo` column is ignored (misleading). The user may type an optional memo on any row.
- One company only (single realm). No multi-realm support.

### Auth
- OAuth 2.0 authorization-code flow, hand-rolled with `fetch` (no `intuit-oauth`, no `node-quickbooks`). Matches the `rgHttp` approach.
- Tokens live in MongoDB (encrypted at rest). Refresh uses an atomic compare-and-swap because refresh tokens rotate and the app runs on Vercel serverless.

### Format and account mapping
- A CSV format is identified by a hash of its normalized header row. Parsers are registered in code, one fingerprint each. Unknown header = import rejected with a clear message.
- Each format maps to a QBO credit card account: one `defaultAccount` plus an optional `otherAccounts[]` the user adds later. Same shape as vendor-to-account mapping.

### Card assignment
- Key: `(formatId, last4)`. Import is BLOCKED until every last4 in the file has an assignment.
- Assignment: `responsibleUserName` (required, a site user) + optional `cardholderName`.
- The picker offers: choose a user, or `<Enter Cardholder Name>` (the current user becomes `responsibleUserName`, the typed name is `cardholderName`).
- A user may be responsible for many cards.
- Purpose: lets each user map their own transactions later. Per-user mapping is NOT built now, but keys and docs must not preclude it.

### Vendor and account mapping
- `merchantKey -> QBO vendor`. `merchantKey` is a normalized description (uppercase, strip text after `*` and `#`, strip digit runs). The user can edit the key.
- Each vendor has one default expense account plus an `otherAccounts[]` list that grows as the user adds categories.
- Amazon-style vendors are ordinary vendors with several accounts.
- New vendors can be created inline (Phase 4).
- Mapping scope in v1 is shared, but mapping docs carry an owner scope field (null = everyone) so per-user rules can be added later.

### Skips
- Every CSV row is persisted with a status. A transaction that appears in a CSV must be logged.
- Skip reasons are defined in code. v1: `payment` (auto), `refund` (auto), `inventoryPurchase` (manual).
- A manual skip requires a reason and offers an optional rule: always skip this merchant for that reason.
- Payments and refunds are never posted. Refunds are handled by the user via journal entry in QBO.

### Format classification rules
- Chase `Type`: `Sale` = postable, `Payment` = skip(payment), `Return` = skip(refund), anything else = import stops with an error naming the type.
- Capital One: Debit = postable. Credit with category `Payment/Credit` = skip(payment). Any other Credit = skip(refund). Fallback: description starting with the bank name = payment. Verify with more exports.

### Duplicate detection
- Neither bank gives a transaction ID, so identity is a hash of row content with minimal columns, scoped by format ID.
- Chase: card, transaction date, post date, description, amount. Capital One: card, transaction date, posted date, description, signed amount (debit minus credit).
- Identical rows in one file are handled by multiplicity: if the DB holds N rows for a hash and the file holds M, then M-N are new.
- Soft check: same card + amount + transaction date but different description or post date is flagged "possible duplicate" for the user to confirm, never blocked.

### Posting and locking
- Batches of up to 30 (QBO limit); max 40 batch requests per minute per realm. Do not assume execution order. Items are independent: a new vendor must exist before purchases that use it, so vendors are created first.
- Results matched by `bId` = our row ID. Partial success is expected and reported per row.
- `DocNumber` (shown as Ref no. in the QBO expense form, unused on manual expenses) holds our marker: a short code derived from the row hash, max 21 chars. Used to reconcile ambiguous outcomes.
- Posted rows are locked in our app. Fixes happen in QBO.

### Access
- `office` and `admin` may import. Enforced in API handler `roles` only, not in the UI.

## Folder Layout (planned)

```
src/app/qbo/
  planning/                  these docs + sampleData/
  _lib/api/                  qboHttp.ts, qboApi.ts, createQboRpcHandler.ts
  _lib/auth/                 token crypto and refresh helpers (pure where possible)
  connection/                token model, connect/callback/status/disconnect, admin page
  vendor/                    mirror of QBO vendors + create op
  account/                   mirror of QBO accounts (expense and credit card)
  csvImport/
    formats/                 registry, fingerprints, per-bank parsers (pure)
    formatAccount/           format -> QBO account mapping
    cardAssignment/          (formatId, last4) -> responsible user
    merchantMapping/         merchantKey -> vendor, default + other accounts
    skipRule/                merchantKey -> skip reason, SKIP_REASONS in code
    importRow/               persisted rows, status, hash, posting
```

Follow the RealGreen conventions: `types/`, `models/`, `api/` (Contract + route), Slice, Select, `useX`. See `src/app/realGreen/realGreen.readme.md`.

## Type Pipeline and Type Boundary

Same pipeline as RealGreen: `Raw` (exact QBO JSON: `Id`, `SyncToken`, `DisplayName`, `*Ref`) -> `Core` (clean camelCase) -> `Doc` (stored, with metadata) -> hydrated. QBO-shaped types are quarantined to `*Raw` types and `remap*` / `remap*Write` functions. Nothing downstream imports them.

## Environment Variables

| Name | Purpose |
|---|---|
| `QBO_CLIENT_ID` | Intuit app client ID |
| `QBO_CLIENT_SECRET` | Intuit app client secret |
| `QBO_REDIRECT_URI` | OAuth callback URL, must match the Intuit app exactly |
| `QBO_ENVIRONMENT` | `sandbox` or `production` |
| `QBO_TOKEN_ENCRYPTION_KEY` | Key for encrypting tokens at rest |

## Open Items

- [ ] Capital One: a sample return/fee row beyond the two credit shapes seen (payment, refund) would help confirm the classification rules.
- [ ] Verify in the sandbox: see the checklist in `qboPhase6.md`.