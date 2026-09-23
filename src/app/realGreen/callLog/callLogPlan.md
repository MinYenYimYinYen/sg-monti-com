# CallLog Module Plan

## 1. Goals

1. **Fetch call log data from the RealGreen API** using a flexible, query-driven approach that mirrors the `CallLogSearch` POST endpoint.
2. **Normalize and type the data** through the standard 4-stage pipeline (Raw → Core → Doc → hydrated entity).
3. **Store call logs in MongoDB** with embedded notes, enabling a sync architecture where Mongo becomes the source of truth.
4. **Lay the groundwork for delta-sync** — the RealGreen search API supports `created` and `updated` date range filters, which is the key to incremental sync.
5. **Write-back to RealGreen** — flagged as a future concern; not designed in this phase.

---

## 2. Module Overview

```
src/app/realGreen/callLog/
  CallLogTypes.ts              ← (exists) Raw → Core → Doc → CallLog type pipeline
  callLogPlan.md               ← (this file)
  layout.tsx                   ← (exists) PageLayout shell for callLog section
  page.tsx                     ← (exists) Overview placeholder page
  _lib/
    baseCallLog.ts             ← (exists) base/fallback objects
    callLogServerFunc.ts       ← remap + extend functions (server-side)
    CallLogSearch.ts           ← CallLogSearchRaw + CallLogSearchCriteria types
    remapCallLogSearch.ts      ← maps our criteria type → RealGreen raw search type
  api/
    CallLogContract.ts         ← TypeScript API contract
    route.ts                   ← Next.js API route using createRpcHandler
  models/
    CallLogModel.ts            ← Mongoose model (full, with notes embedded)
  callLogSlice.ts              ← Redux slice + thunks
  callLogSelect.ts             ← Reselect selectors
  useCallLog.ts                ← React hook for dispatching thunks
  sync/
    callLogSyncFunc.ts         ← fetchCallLogs() + bulkUpsertCallLogs()
    CallLogSyncContract.ts     ← sync API contract
    api/route.ts               ← POST /realGreen/callLog/sync/api
```

---

## 3. Type Architecture

### 3.1 CallLogNote (Embedded)

Notes are embedded within their parent `CallLogDoc`. They are not stored in a separate collection.

**Type pipeline:**
```
CallLogNoteRaw → CallLogNoteCore
```

`CallLogNote` is a direct alias for `CallLogNoteCore` — no hydration needed. The `reason` field already contains the human-readable string from RealGreen (e.g., `"Account Update - In Process"`).

> **Discovery (2026-09-23):** The `reason` field was originally assumed to be a numeric ID requiring a lookup table via `GET /CallReason`. Sandbox testing confirmed it arrives as a human-readable string. The `callLogReason` sub-module was removed.

### 3.2 CallLog (Parent)

**Type pipeline:**
```
CallLogRaw → CallLogCore → CallLogDoc → CallLog
```

`CallLog` (hydrated) has:
- `notes: CallLogNote[]` — embedded notes, each with `reason` as a human-readable string

**Key fields already on `CallLogCore`:**
- `status: string` — human-readable description (e.g., `"Resolved"`, `"In Process"`, `"Z_OBS_New Call"`)
- `resolved: boolean` — already a first-class boolean from RealGreen

> **Discovery (2026-09-23):** The `status` field was originally assumed to be a single-character code (e.g., `"X"`, `"Z"`) requiring a lookup table. Sandbox testing confirmed it arrives as a full description string. The `callLogStatus` sub-module was removed.

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

## 6. Redux Architecture

### 6.1 Slice State

```typescript
type CallLogState = {
  callLogCores: CallLogCore[];
};
```

### 6.2 Hydrated Types

```typescript
// CallLogNote is a direct alias — no hydration needed
export type CallLogNote = CallLogNoteCore;

// CallLogProps — notes only; status and resolved are already on CallLogCore
export type CallLogProps = {
  notes: CallLogNote[];
};

export type CallLog = CallLogDoc & CallLogProps;
```

---

## 7. Customer Integration

`callLogs: CallLog[]` is added to `CustomerProps` and wired through `makeCustomersSelector` via `callLogSelect.callLogsByCustId` (already implemented).

---

## 8. API Contract

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

**`getCallLogs` (search-based) is handled by the sync layer.** See `callLogSyncPlan.md`.

---

## 9. `rgApi` Registration

`CallLogSearch` POST is registered in `rgApi.ts`.

---

## 10. Root Reducer Registration

`callLogReducer` is registered in `src/store/reducers/index.ts`.

---

## 11. Sync Architecture

See `callLogSyncPlan.md` for the full delta-sync design.

**Key invariants:**
- `callLogId` is the natural key — always use it as the upsert key
- `updatedAt` on the Mongo document reflects when **we** last synced it
- Notes are always replaced wholesale on sync — no note-level diffing

---

## 12. Write-Back (Future)

> Not designed in this phase. Flagged for future exploration.

---

## 13. Open Questions (Resolved via Sandbox)

1. **`reason` field on notes:** Arrives as a human-readable string (e.g., `"Account Update - In Process"`), not a numeric ID. No lookup table needed. The `callLogReason` sub-module was removed.

2. **`status` field on `CallLog`:** Arrives as a human-readable description string (e.g., `"Resolved"`, `"In Process"`, `"Z_OBS_New Call"`), not a single-character code. The `resolved` boolean is also already on the call log. No lookup table needed. The `callLogStatus` sub-module was removed.

3. **Notes on `/CallLog/Customer/{id}`:** Notes are always embedded in the response.

4. **Employee hydration on `CallLog`:** Deferred. Add `enteredByEmployee` and `assignedToEmployee` to `CallLogProps` when a concrete UI need arises.

---

## 14. Removed Sub-Modules

### 14.1 `callLogReason` (Removed 2026-09-23)

Originally designed to fetch `GET /CallReason` and provide a lookup table for the `reason` field on notes. Removed after sandbox testing confirmed `reason` is already a human-readable string — no lookup needed.

### 14.2 `callLogStatus` (Removed 2026-09-23)

Originally designed as a native MongoDB module to store status code configurations, because the `status` field was assumed to be a single-character code with no RealGreen API endpoint for the lookup table. Removed after sandbox testing confirmed `status` is already a human-readable description string, and `resolved` is already a boolean on the call log.
