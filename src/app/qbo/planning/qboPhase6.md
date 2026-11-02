# QBO Integration - Phase 6: Posting

## Required Reading

- Skills: `data-module`, `api-route`
- `src/lib/errors/errors.readme.md`
- Phase 5 (row model and statuses)

## Goal

Post pending rows to QBO as credit card `Purchase` transactions in batches, report per-row results, lock posted rows, and never double-post.

## QBO Batch Facts (from Intuit's batch docs)

- `POST /v3/company/<realmID>/batch` with `BatchItemRequest[]`; each item has `bId`, `operation` and the entity payload.
- Max 30 items per batch. Max 40 batch requests per minute per realm. Pace well under it.
- Execution order must not be assumed. Items are independent (a newly created vendor is not available to a purchase in the same batch).
- Response: `BatchItemResponse[]`, matched by `bId`. Each entry has the created object or a `Fault` with `type` and `Error[]` (`Message`, `code`, `Detail`, `element`).
- Not atomic from our point of view: partial success is expected.

## Posting Flow

1. **Pre-flight (pure function):** every pending row must have vendor and account; vendor and account must be active in the mirror; amount > 0; date valid. Rows failing pre-flight are not sent and are shown with the reason.
2. **Step 1, new vendors:** create any queued new vendors first (Phase 4), wait for IDs, update mappings.
3. **Step 2, purchases:** chunk into batches of 30. Set `bId` = row ID. Mark rows `posting` before sending.
4. **Map results by `bId`:** success -> `posted` (store `qboId`, `syncToken`, lock the row). Fault -> `failed` (store code, message, detail).
5. **Report to the user:** per-row result and a summary, for example "9 posted, 1 failed: <message>".

### Purchase payload (`remapPurchaseWrite`)
- `PaymentType: "CreditCard"`, `AccountRef` = credit card account, `TxnDate` = transaction date, `EntityRef` = vendor (`Type: Vendor`), `DocNumber` = marker (short row hash, max 21 chars), one line `DetailType: AccountBasedExpenseLineDetail` with `AccountRef` = expense account, `Amount`, `Description` = optional memo.
- Our types in, QBO shape constructed inside the remap function only.

## Fault Handling

| Case | Handling |
|---|---|
| ValidationFault, per row, fixable (inactive/deleted vendor or account, bad field) | Row `failed`, shown with message, editable, retryable. Error 610 does not say which reference is inactive: re-sync vendors and accounts, re-run pre-flight, ask the user to re-pick. |
| SystemFault, per row | `failed`, flagged retryable. |
| Request-level 401 | Refresh the token once and retry the batch. If it fails again, show "reconnect QuickBooks" and leave rows `pending`. |
| Request-level 429 | Back off and retry. |
| Timeout / network error after send | Outcome unknown: mark rows `unknown`, NOT `failed`. Reconcile before any retry. |

### Reconciliation of `unknown` rows
- Query QBO for purchases carrying our `DocNumber` markers (queries are supported inside a batch). Rows found: mark `posted` (store QBO IDs). Rows not found: back to `pending` for retry. Only then repost.
- 6240 (duplicate name) applies to vendor create (Phase 4). 5010 (stale object) applies to updates only, which we do not do.

## Locking

- `posted` rows are read-only in our app. Failed rows stay editable. Corrections to posted transactions happen in QBO.

## Sandbox Verification Checklist (user + us)

- [ ] Confirm the exact success shape of a `Purchase` create inside `BatchItemResponse`.
- [ ] Confirm an API-created credit card Purchase shows `DocNumber` in the **Ref no.** field of the QBO expense form.
- [ ] Confirm QBO accepts duplicate `DocNumber` values without error.
- [ ] Confirm a query can find purchases by `DocNumber` (needed for reconciliation); if not, find the best filterable field.
- [ ] Confirm the `DocNumber` length limit (expected 21).
- [ ] Provoke a validation fault (use an inactive vendor/account) and record the real Fault payload.
- [ ] Confirm the vendor name length limit and behavior for names that collide with a customer or employee.
- [ ] Post a batch of 30 and one with a deliberately bad row; confirm partial success and `bId` matching.

## Your Tasks

- [ ] Run the sandbox checklist above with us (you look at the QBO sandbox UI; we read the API responses).
- [ ] Review fault message wording shown to the user.
- [ ] Post one real-looking month into the sandbox and compare totals with the CSV.

## Our Tasks

- [ ] Pure functions: pre-flight, chunking, `remapPurchaseWrite`, batch response mapping by `bId`, fault classification
- [ ] `post` op and server function (roles `office`, `admin`), call pacing
- [ ] Status transitions and locking on `importRow`
- [ ] Reconciliation of `unknown` rows
- [ ] Results UI: per-row status, summary, retry for failed rows
- [ ] Offer tests for the pure helpers when done

## Done Criteria

- [ ] A 10-row sandbox post with one bad row yields 9 `posted` and 1 `failed` with its message.
- [ ] Simulated timeout leads to `unknown`, then reconciliation without double-posting.
- [ ] Posted rows cannot be edited.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.