# QBO Integration - Phase 5: CSV Import, Formats, Mappings, Skips, Duplicates

## Required Reading

- Skills: `data-module`, `api-route`, `ui-styling`, `tab-routed-page`
- Sample files: `sampleData/CapitalOne Sample.csv`, `sampleData/Chase Sample.csv`
- Skip testable logic into pure functions (no store, hooks or React): parsers, normalization, hashing, classification, duplicate comparison.

## Goal

Upload a CSV, identify its format, resolve who/what/where for every row from stored mappings, let the user fill the gaps, and persist every row with a status. Nothing is posted in this phase.

## Formats

| | Capital One | Chase |
|---|---|---|
| Header | Transaction Date, Posted Date, Card No., Description, Category, Debit, Credit | Card, Transaction Date, Post Date, Description, Category, Type, Amount, Memo |
| Amount | Debit = charge, Credit = payment or refund | Signed: negative = charge, positive = payment or return |
| Transaction ID | None | None |

### Registry
- Code-defined list of formats: `formatId`, header signature, `parse(row) -> CardTransaction`. Fingerprint = hash of the normalized header (trim, lowercase, join).
- Unknown fingerprint: reject with a clear message. Changed bank columns therefore never get parsed by the wrong parser; a new parser means a new `formatId`.
- Format -> account mapping stored in Mongo (data module): `defaultAccount` (QBO credit card account) plus optional `otherAccounts[]`. First import of a format prompts once. The account picker appears at import only if `otherAccounts` is non-empty.

### Normalized `CardTransaction`
`formatId`, `cardLast4`, `transactionDate`, `postDate`, `rawDescription`, `merchantKey`, `amount` (positive = charge), `kind` (`charge`, `payment`, `refund`), `sourceCategory`. The bank category is a display hint only. Chase `Memo` is ignored.

### Classification
- Chase `Type`: `Sale` = charge, `Payment` = payment (auto-skip), `Return` = refund (auto-skip), anything else = stop the import with an error naming the unknown type.
- Capital One: Debit = charge. Credit with category `Payment/Credit` = payment. Any other Credit = refund. Fallback: description beginning with the bank name = payment. Verify with more exports.
- Payments and refunds are persisted as skipped rows with reasons `payment` / `refund`, never posted.

## Card Assignment

- Key `(formatId, last4)`. Fields: `responsibleUserName` (required) and optional `cardholderName`.
- Picker: choose a user, or `<Enter Cardholder Name>` (current user becomes `responsibleUserName`, typed name is `cardholderName`).
- A user may be responsible for many cards.
- Import is BLOCKED until every last4 in the file has an assignment.
- Each row carries `responsibleUserName` (and the holder name). Mapping docs carry an owner scope (null = everyone in v1) so per-user rules are possible later. Not built now.
- Later idea (not now): admin reassigns a name-only holder to a real user once they get a login.

## Merchant, Vendor, Account Mapping

- `merchantKey`: uppercase, strip everything after `*` and `#`, strip digit runs, collapse whitespace. Examples: `AMAZON MKTPL*VQ0ST9ZQ3` and `Amazon.com*BL82J1O73` should both reduce to an Amazon-like key; `BP#3213900MONTICELLO BP` loses its store number. Exact rules finalized against more data; user can edit the key.
- Merchant mapping: `merchantKey -> vendor qboId`, `defaultExpenseAccount`, `otherAccounts[]`.
- Row UX: mapped rows are auto-filled with a quick override (default account, then the vendor's short list, then "any account", which appends to the list). Unmapped keys prompt once.
- Optional per-row memo (becomes the QBO line `Description`).
- New vendor inline: see Phase 4.

## Skips

- Skip reasons are defined in code (`SKIP_REASONS`). v1: `payment` (auto), `refund` (auto), `inventoryPurchase` (manual).
- Manual skip requires a reason and offers an optional rule "always skip this merchant for this reason" (stored as a skip rule, applied automatically on later imports, still logged).
- Skipped rows are saved, never dropped.

## Row Identity and Duplicate Detection

- Hash per format of the minimal columns, prefixed with `formatId`.
  - Chase: card, transaction date, post date, description, amount.
  - Capital One: card, transaction date, posted date, description, signed amount (debit minus credit).
- Identical rows in the same file (for example two ANTHROPIC charges of the same amount on one day) are handled by multiplicity: DB has N rows with the hash, file has M, so M-N are new. This also works for partly overlapping files.
- Soft check: same card + amount + transaction date but different description or post date = "possible duplicate", flagged for confirmation, never blocked.
- Store the full hash and a short form (used as the QBO `DocNumber` marker in Phase 6; max 21 chars).

## Persisted Row (`importRow`)

`rowHash`, `formatId`, `cardLast4`, `responsibleUserName`, transaction fields, `status` (`pending`, `skipped`, `posting`, `posted`, `failed`, `unknown`), `skipReason?`, `vendorQboId?`, `accountQboId?`, `memo?`, `duplicateFlag?`, `qboId?`, `syncToken?`, `faultCode?`, `faultMessage?`, `importedBy`, timestamps (ISO strings). Posted rows are locked.

## Your Tasks

- [ ] Provide a few more redacted sample rows: a Capital One return or fee, and a Chase fee or adjustment if one exists, so classification covers real cases.
- [ ] Provide a larger real (redacted) export from each bank so we can tune `merchantKey` normalization.
- [ ] Decide initial skip reason labels/wording for the UI.
- [ ] Review the import screen once built with real data: check duplicate flags against a month you already entered by hand.

## Our Tasks

- [ ] Pure functions: header fingerprint, per-format parsers, classification, `merchantKey`, row hash, duplicate comparison (multiplicity and soft check)
- [ ] Modules (data-module flow): `formatAccount`, `cardAssignment`, `merchantMapping`, `skipRule`, `importRow`
- [ ] Import page: upload, parse, unassigned-card blocking prompt, mapping grid, skip dialog, duplicate flags
- [ ] Roles on all routes: `office`, `admin`
- [ ] Offer tests for the pure helpers when done

## Done Criteria

- [ ] Both sample files import and every row is persisted with a status.
- [ ] Re-importing the same file produces zero new rows.
- [ ] Overlapping files flag only the overlapping rows.
- [ ] Reminder: run `npx tsc --noEmit` after this phase.