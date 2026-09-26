# Corrupted Records Plan

This document outlines the plan for capturing, persisting, and surfacing data about corrupted RealGreen records encountered during sync operations.

---

## Background

During full sync of services (and potentially programs), RealGreen's API throws `"Nullable object must have a value."` when a paginated fetch encounters a record with corrupted data. The existing `binarySearchCorruptedRecord` function isolates the exact offset of each corrupted record and skips it, allowing the sync to continue.

The number of corrupted records encountered during the initial service sync was significant enough to raise concern about data parity with the CRM. We need a way to identify which records are corrupted so they can be investigated in RealGreen.

---

## Goal

Build a pipeline that:
1. **Captures** neighbor context (the valid records immediately before and after each corrupted record) during sync
2. **Persists** that context to MongoDB
3. **Surfaces** it via a UI so patterns can be identified (e.g., specific customers, programs, seasons, or service codes that consistently produce corrupted records)

---

## What We Know at the Point of Corruption

When `binarySearchCorruptedRecord` isolates a corrupted record, we have access to:
- The **offset** of the corrupted record in the paginated result set
- The **entity type** (`customer`, `program`, `service`) from `searchType`
- The **records immediately before** the corrupted offset (Phase 2 of the binary search)
- The **records immediately after** the corrupted offset (Phase 4 of the binary search)

From the neighbor records (for services), we can extract:
- `servId` — the service IDs bracketing the gap
- `custId` (`customerNumber` in raw) — likely the same customer if services are ordered by customer
- `progId` (`programID` in raw) — the program IDs

This gives a tight range to search in RealGreen CRM. If services are returned in a consistent order, the corrupted record's IDs will be numerically between the neighbors.

---

## Resolved Design Decisions

### CorruptedContext Shape

One `CorruptedContext` object is created per corrupted record encountered. The binary search functions accumulate these into an array (since a single search can encounter multiple corrupted records via recursion) and return the array to the caller.

```typescript
type CorruptedContext = {
  corruptedContextId: string;       // UUID — unique per hit
  entityType: "customer" | "program" | "service";
  entityBeforeId: number | null;    // natural key of the record immediately before the gap
  entityAfterId: number | null;     // natural key of the record immediately after the gap
  timestamp: string;                // ISO 8601 — shared across all hits in one sync operation
};
```

**Key decisions:**
- **Key IDs only** (not full raw records) — keeps the collection lean; the goal is investigation, not replay
- **No deduplication** — each sync encounter is a distinct observation; patterns emerge from repeated `entityBeforeId`/`entityAfterId` values across multiple timestamps
- **Shared timestamp** — generated once at the start of each sync operation, identical for all hits in that operation; the UI groups by timestamp
- **Append-only collection** — no natural key; MongoDB `_id` is the document identifier

### Location

All corrupted records files live in `src/app/realGreen/customer/sync/corruptedRecords/` as a standard data module.

### Capture Sites

Corruption is captured **only in the sync funcs** (`serviceSyncFunc.ts`, `programSyncFunc.ts`, `customerSyncFunc.ts`). The live pipeline (step factories) is excluded — sync operations are the primary investigation target, and the live pipeline would produce duplicate hits for the same records.

---

## Data Model

```typescript
// CorruptedSyncRecord — one document per corrupted record encounter
type CorruptedSyncRecord = {
  corruptedContextId: string;       // UUID
  entityType: "customer" | "program" | "service";
  entityBeforeId: number | null;
  entityAfterId: number | null;
  timestamp: string;                // ISO 8601 — groups all hits from one sync operation
};
```

MongoDB collection: `CorruptedSyncRecord`
Indexes: `entityType`, `timestamp`, `entityBeforeId`, `entityAfterId`

---

## Architecture

### Phase 1: Corrupted Records Capture

#### 1a. Modify `binarySearchCorruptedRecord` (`binaryOffsetSearch.ts`)

Change the function to accumulate `CorruptedContext[]` across all recursive calls. After Phase 2 (before records) and Phase 4 (after records) complete, push a `CorruptedContext` hit to the array. Return the accumulated array alongside the generator results.

The `entityBeforeId` is the natural key of the last item yielded from Phase 2. The `entityAfterId` is the natural key of the first item yielded from Phase 4. For services: `raw.id` (servId). For programs: `raw.id` (progId). For customers: `raw.id` (custId).

#### 1b. Modify `binarySearchCorruptedId` (`binaryIdSearch.ts`)

Same pattern — accumulate `CorruptedContext[]`. After isolating the corrupted ID, push a hit with `entityBeforeId = ids[corruptedIdIndex - 1]` and `entityAfterId = ids[corruptedIdIndex + 1]`.

#### 1c. New Data Module: `customer/sync/corruptedRecords/`

Standard data module pattern:

```
src/app/realGreen/customer/sync/corruptedRecords/
  CorruptedSyncRecordTypes.ts       — CorruptedContext + CorruptedSyncRecord types
  CorruptedSyncRecordModel.ts       — Mongoose model, append-only
  CorruptedSyncRecordContract.ts    — getCorruptedSyncRecords op (params TBD)
  corruptedSyncRecordSlice.ts       — thin Redux slice
  corruptedSyncRecordSelect.ts      — selectors (by entityType, by timestamp)
  useCorruptedSyncRecord.ts         — auto-fetch hook
  api/
    route.ts                        — GET handler (stub — params not yet settled)
```

#### 1d. Persist in Sync Funcs

In `serviceSyncFunc.ts`, `programSyncFunc.ts`, `customerSyncFunc.ts`:
1. Generate a shared `timestamp` (ISO string) at the start of `fetchXxx()`
2. Pass `timestamp` and `entityType` into the binary search calls
3. Collect all `CorruptedContext[]` returned from binary search calls across all pages
4. After fetch completes, batch-insert to `CorruptedSyncRecordModel` (if any hits)

---

### Phase 2: Mirror Pipeline Framework

The **mirror pipeline** is a new customer data fetch pathway that reads from our synced MongoDB collections instead of calling the RealGreen API. This is the first feature that reads customer data from Mongo rather than from RealGreen directly.

#### Why "Mirror"

The word "mirror" accurately describes the relationship: our MongoDB collections are a mirror of RealGreen's data, kept in sync via the sync pipeline. It's distinct from "sync" (the operation) and from the RealGreen API routes.

#### Architecture

**New route:** `src/app/realGreen/customer/mirror/api/route.ts`
- Uses `createRpcHandler` (not `createRealGreenRpcHandler` — no RealGreen API calls)
- Streams NDJSON chunks: one for customers, one for programs, one for services
- Params: **not yet implemented** — to be designed when the corrupted records UI is built

**New contract:** `CustomerMirrorContract.ts`
- `getMirrorCustomers` op
- Params: TBD (stub for now)
- Result: `DataResponse<StreamChunk[]>` — same `StreamChunk` shape as the existing pipeline

**New thunk factory:** `createGetCustDocsMirrorThunk`
- Sibling to `createGetCustDocsThunk`
- Uses `createStreamThunk` (same abstraction level) but points to `/realGreen/customer/mirror/api`
- `onChunk` dispatches `slice.actions.receiveChunk` — identical to the existing factory
- `typePrefix` follows the same `${sliceName}/getCustDocs` convention so `pending` clears state

**New customer slice:** `corruptedRecordsCustomer`
- Created via `createCustomerSlice("corruptedRecordsCustomer")` — no changes to the factory
- `getDocs` uses `createGetCustDocsMirrorThunk` instead of `createGetCustDocsThunk`
- Registered in `customerSliceRegistry` as `context: "corruptedRecords"`
- Registered in `customerReducers.ts` as `corruptedRecords: corruptedRecordsCustomerReducer`

**Type change:** `CustomerSliceGetDocs` widened from `ReturnType<typeof createGetCustDocsThunk>` to `AsyncThunk<void, WithConfig<any>, any>` — the structural type both factories satisfy.

**`CustomerContextMode`:** Add `"corruptedRecords"` to the union.

#### Streaming Strategy

The mirror route streams three NDJSON chunks (customers → programs → services). This matches the existing `receiveChunk` reducer exactly and leaves the door open for future pagination if needed. Load time without pagination will be measured once the route is implemented to decide whether streaming multiple chunks adds value.

---

## UI (Phase 3 — Blocked on Phase 1 + 2)

A sandbox page at `src/app/sandbox/corruptedRecords/page.tsx` that:
- Lists all corrupted record encounters grouped by `timestamp`
- Shows `entityType`, `entityBeforeId`, `entityAfterId` for each hit
- Highlights repeated `entityBeforeId`/`entityAfterId` values (same record appearing across multiple syncs)
- On selecting a timestamp group, dispatches the mirror thunk with the relevant `custId`s to load full customer data using the existing selector pipeline

---

## Status

| Step | Status |
|---|---|
| Background understanding + plan doc | ✅ Done |
| Resolve open questions (data model, deduplication, key strategy) | ✅ Done |
| Update plan doc with resolved decisions | ✅ Done |
| Modify `binarySearchCorruptedRecord` to accumulate CorruptedContext[] | ⬜ Not started |
| Modify `binarySearchCorruptedId` to accumulate CorruptedContext[] | ⬜ Not started |
| Create `corruptedRecords/` data module (types, model, contract, slice, selectors, hook, api stub) | ⬜ Not started |
| Persist corrupted context in sync funcs (service, program, customer) | ⬜ Not started |
| Create `CustomerMirrorContract.ts` + `mirror/api/route.ts` stub | ⬜ Not started |
| Add `createGetCustDocsMirrorThunk` + `corruptedRecords` slice to `customerSlices.ts` | ⬜ Not started |
| Register mirror slice in `customerReducers.ts` + widen `CustomerSliceGetDocs` type | ⬜ Not started |
| Corrupted records sandbox UI (Phase 3) | ⬜ Not started |

---

## Notes

- The corrupted records are a RealGreen data quality issue, not a bug in this app. The goal is investigation and reporting, not fixing the records (that must be done in RealGreen CRM).
- The live pipeline (`stepFactories.ts`) already handles corrupted records gracefully via `binarySearchCorruptedRecord` and `binarySearchCorruptedId`. This plan adds observability on top of the existing recovery mechanism, scoped to sync operations only.
- The mirror pipeline is the first use of our synced MongoDB data for UI queries. All previous modules use the RealGreen API search scheme workflow. The mirror pipeline runs alongside the existing pipeline — no destructive refactoring.
- Mirror route params are intentionally left as a stub. They will be designed when the corrupted records UI is built and the exact query needs are known.
