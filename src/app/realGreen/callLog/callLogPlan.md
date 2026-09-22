# CallLog Module Plan

## 1. Goals

1. **Fetch call log data from the RealGreen API** using a flexible, query-driven approach that mirrors the `CallLogSearch` POST endpoint.
2. **Normalize and type the data** through the standard 4-stage pipeline (Raw → Core → Doc → hydrated entity).
3. **Resolve `CallLogReason` metadata** — a separate sub-module that provides a lookup table for the `reason` field on each note.
4. **Store call logs in MongoDB** with embedded notes, enabling a future sync architecture where Mongo becomes the source of truth.
5. **Lay the groundwork for delta-sync** — the RealGreen search API supports `created` and `updated` date range filters, which is the key to incremental sync.
6. **Write-back to RealGreen** — flagged as a future concern; not designed in this phase.

---

## 2. Module Overview

```
src/app/realGreen/callLog/
  CallLogTypes.ts              ← (exists) Raw → Core → Doc → CallLog type pipeline
  callLogPlan.md               ← (this file)
  layout.tsx                   ← (exists) PageLayout + TabNav for callLog section
  page.tsx                     ← (exists) Overview page with section cards
  _lib/
    baseCallLog.ts             ← (exists) base/fallback objects
    callLogServerFunc.ts       ← remap + extend functions (server-side)
    CallLogSearch.ts           ← CallLogSearchRaw + CallLogSearchCriteria types
    remapCallLogSearch.ts      ← maps our criteria type → RealGreen raw search type
  api/
    CallLogContract.ts         ← TypeScript API contract
    route.ts                   ← Next.js API route using createRpcHandler
  models/
    CallLogDocPropsModel.ts    ← Mongoose model for CallLogDocProps
  callLogSlice.ts              ← Redux slice + thunks
  callLogSelect.ts             ← Reselect selectors
  useCallLog.ts                ← React hook for dispatching thunks
  callLogReason/               ← Sub-module (see Section 6)
    CallLogReasonTypes.ts
    _lib/
      baseCallLogReason.ts
      callLogReasonServerFunc.ts
    api/
      CallLogReasonContract.ts
      route.ts
    models/
      CallLogReasonDocPropsModel.ts
    callLogReasonSlice.ts
    callLogReasonSelect.ts
    useCallLogReason.ts
  callLogStatus/               ← Sub-module (see Section 15)
    CallLogStatusTypes.ts
    _lib/
      baseCallLogStatus.ts
    api/
      CallLogStatusContract.ts
      route.ts
    models/
      CallLogStatusModel.ts
    callLogStatusSlice.ts
    callLogStatusSelect.ts
    useCallLogStatus.ts
    page.tsx
```

---

## 3. Type Architecture

### 3.1 CallLogReason (Metadata Lookup)

The `reason` field on `CallLogNoteRaw` is a string referencing a RealGreen metadata object. The full shape from the RealGreen API is:

```typescript
type CallLogReasonRaw = {
  actionReasonID: number;
  actionReason: string;
  status: string;
  contactOrAttempt: string;  // "C" = Contact, "A" = Attempt
  handheld: boolean;
  actionReasonFrench: string;
  actionReasonSpanish: string;
  letterID: number;
  sendNote: boolean;
  blockLead: boolean;
};
```

**Key fields for our use:**
- `actionReasonID` → natural key (`reasonId`)
- `actionReason` → display label (`reason`)
- `status` → may drive UI behavior
- `contactOrAttempt` → distinguishes contact vs. attempt
- `sendNote` / `blockLead` → behavioral flags

**Type pipeline:**
```
CallLogReasonRaw → CallLogReasonCore → CallLogReasonDoc → CallLogReason
```

### 3.2 CallLogNote (Embedded)

Notes are embedded within their parent `CallLogDoc`. They are not stored in a separate collection.

**Type pipeline:**
```
CallLogNoteRaw → CallLogNoteCore → (embedded in CallLogDoc) → CallLogNote (hydrated)
```

`CallLogNote` (the hydrated type) resolves `reason: string` → `callLogReason: CallLogReason | null`.

### 3.3 CallLog (Parent)

**Type pipeline:**
```
CallLogRaw → CallLogCore → CallLogDoc → CallLog
```

`CallLog` (hydrated) has:
- `notes: CallLogNote[]` — each note's reason resolved to a full `CallLogReason` object
- `callLogStatus: CallLogStatus | null` — `status` code resolved to a full `CallLogStatus` object

---

## 4. Search / Fetch Strategy

### 4.1 The Two RealGreen Endpoints

**Endpoint A: `/CallLog/Customer/{custId}` (GET)**
- Returns all call logs for a single customer, with notes embedded
- Use case: on-demand fetch for a single customer detail view

**Endpoint B: `/CallLog/CallLogSearch` (POST)**
- Paginated: `records` (max 500) + `offset` fields
- Supports rich filtering including `created` and `updated` date ranges (the **delta-sync keys**)
- Use case: bulk fetch, sync operations, cross-customer queries

### 4.2 Search Type Remapping

**`CallLogSearchRaw`** — mirrors the RealGreen API body exactly.

**`CallLogSearchCriteria`** — our preferred naming and types.

**`remapCallLogSearch(criteria: CallLogSearchCriteria): CallLogSearchRaw`** — maps our type to the RealGreen type.

### 4.3 Pagination

The `records` field caps at 500. For queries that may return more than 500 records, the caller must implement pagination. See `callLogSyncPlan.md` for the capped exponential batch fetch algorithm.

---

## 5. Storage Strategy

### 5.1 MongoDB Document Shape

`CallLogDoc` is stored as a single Mongo document per call log, with notes embedded. Natural key: `callLogId`.

### 5.2 Upsert Strategy

On each fetch/sync, upsert by `callLogId`. The entire `notes` array is replaced on each upsert — RealGreen is the source of truth for note content.

---

## 6. CallLogReason Sub-Module

Lives at `src/app/realGreen/callLog/callLogReason/`.

**RealGreen API endpoint:** `GET /CallReason` (confirmed via Swagger).

**Fetch strategy:** Fetch once, cache with `staleTime`. This is a static-ish lookup table.

**Hydration role:** `callLogReasonSelect.reasonMap` resolves `note.reason` → `note.callLogReason` on the hydrated `CallLogNote` type.

---

## 7. Redux Architecture

### 7.1 Slice State

```typescript
type CallLogState = {
  callLogCores: CallLogCore[];
};
```

### 7.2 Hydrated Types

```typescript
type CallLogNoteProps = {
  callLogReason: CallLogReason | null;
};
type CallLogNote = CallLogNoteCore & CallLogNoteProps;

type CallLogProps = {
  notes: CallLogNote[];
  callLogStatus: CallLogStatus | null;
};
type CallLog = CallLogDoc & CallLogProps;
```

---

## 8. Customer Integration

`callLogs: CallLog[]` is added to `CustomerProps` and wired through `makeCustomersSelector` via `callLogSelect.callLogsByCustId` (already implemented).

---

## 9. API Contract

Single pass-through operation for UI use:

```typescript
interface CallLogContract extends ApiContract {
  getCallLogsForCustomer: {
    params: { custId: number };
    result: DataResponse<CallLogCore[]>;
  };
}
```

The route calls `rgApi` GET `/CallLog/Customer/{custId}`, remaps, and returns cores directly — **no Mongo writes**.

**`getCallLogs` (search-based) is deferred to the sync layer.** See `callLogSyncPlan.md`.

---

## 10. `rgApi` Registration

`CallLogSearch` POST and `CallReason` GET are registered in `rgApi.ts`.

---

## 11. Root Reducer Registration

`callLogReducer`, `callLogReasonReducer`, and `callLogStatusReducer` are registered in `src/store/reducers/index.ts`.

---

## 12. Sync Architecture (Future)

See `callLogSyncPlan.md` for the full delta-sync design.

**Key invariants:**
- `callLogId` is the natural key — always use it as the upsert key
- `updatedAt` on the Mongo document reflects when **we** last synced it
- Notes are always replaced wholesale on sync — no note-level diffing

---

## 13. Write-Back (Future)

> Not designed in this phase. Flagged for future exploration.

---

## 14. Open Questions (Resolved via Sandbox)

1. **`reason` field on notes:** Arrives as a human-readable string (e.g., `"Account Update - In Process"`), not a numeric ID. The `callLogReasonSelect` handles both numeric and string lookups defensively.

2. **`contactOrAttempt` on `CallLogReason`:** Confirmed values are `"C"` (Contact) and `"A"` (Attempt).

3. **Notes on `/CallLog/Customer/{id}`:** Notes are always embedded in the response.

4. **`status` values on `CallLog`:** Single-character codes (e.g., `"X"`, `"Z"`). No RealGreen API endpoint exists for the status table — see Section 15.

5. **Employee hydration on `CallLog`:** Deferred. Add `enteredByEmployee` and `assignedToEmployee` to `CallLogProps` when a concrete UI need arises.

---

## 15. Call Log Status Sub-Module

Lives at `src/app/realGreen/callLog/callLogStatus/`.

### 15.1 The Problem

RealGreen does not expose an API endpoint for call log status configuration. Each company's RealGreen instance has its own set of status codes (single-character strings like `"X"`, `"Z"`, `"2"`) configured in the CRM's "Call Log Status Setup" screen. The `resolved` flag on each status determines whether a call log with that status is considered closed.

### 15.2 Current Solution

A native data module (`callLogStatus`) stores status configurations in MongoDB. Admins enter status codes manually via the UI at `/realGreen/callLog/callLogStatus`.

**Type:**
```typescript
type CallLogStatus = CreatedUpdated & {
  code: string;          // natural key — single-char RealGreen status code
  description: string;   // human-readable label
  resolved: boolean;     // whether this status counts as resolved
  isDefault: boolean;    // the CRM default status for new call logs
};
```

**Hydration:** `CallLog.callLogStatus: CallLogStatus | null` is resolved in `callLogSelect` via `callLogStatusSelect.statusMap: Map<string, CallLogStatus>`. If no matching status is configured, `callLogStatus` is `null`.

### 15.3 Limitations

- **Staleness:** If a CRM admin adds or modifies a status code in RealGreen, the app will not reflect the change until an admin manually updates the `callLogStatus` collection.
- **Multi-tenancy blocker:** Each RealGreen company has its own status configuration. This module is the correct long-term architecture (per-company CRUD), but the initial data must be entered manually per deployment.

### 15.4 Deferred: Status Discovery UI

**Blocked on:** Call log sync being established (see `callLogSyncPlan.md` Section 13).

Once call logs are synced to MongoDB, the status discovery workflow is:
1. Query Mongo for all distinct `status` values: `db.callLogs.distinct("status")`
2. Compare against the `callLogStatus` collection
3. Surface any unmapped codes in the admin UI at `/realGreen/callLog/callLogStatus`
4. Allow the admin to create `CallLogStatus` entries for unmapped codes inline

This UI is deferred because querying unique statuses from the live RealGreen API (one customer at a time) is impractical at scale. After sync, a single Mongo query gives the complete picture.

### 15.5 Deferred: CRUD UI

The status table page at `/realGreen/callLog/callLogStatus` currently shows loaded statuses but has no add/edit/delete controls. The `CallLogStatusContract` already defines `upsert` and `delete` operations — the UI just needs to be built.

---

## 16. Proposed File Creation Order (Remaining — Sync Phase)

1. `models/CallLogModel.ts` — full Mongoose model (not just DocProps)
2. `_lib/CallLogSearch.ts` — search type definitions
3. `_lib/remapCallLogSearch.ts` — search remap function
4. `sync/SyncMetadataModel.ts` — tracks `lastSyncedAt` per entity type
5. `sync/callLogSyncFunc.ts` — `fetchCallLogs` (paginated), `bulkUpsertCallLogs`
6. `sync/CallLogSyncContract.ts` — sync API contract
7. `sync/route.ts` — sync API route handler
8. Test via sandbox or direct API call
9. Wire to Vercel Cron (or equivalent) for automated scheduling
10. **After sync:** Implement Status Discovery UI (see Section 15.4)
11. **After sync:** Implement CRUD UI for `callLogStatus` (see Section 15.5)
