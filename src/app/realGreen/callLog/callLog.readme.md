# CallLog Module

## Overview

The callLog module fetches, stores, and serves RealGreen call log data. Call logs are synced
from RealGreen into MongoDB via the `mirrorSync` cron job and served to the UI from MongoDB.
The UI can also fetch a single customer's call logs on-demand directly from the RealGreen API.

---

## File Structure

```
src/app/realGreen/callLog/
  callLog.readme.md           ← this document
  CallLogTypes.ts             ← Raw → Core → Doc → CallLog type pipeline
  callLogSlice.ts             ← Redux slice + thunks
  callLogSelect.ts            ← Reselect selectors
  useCallLog.ts               ← React hook for dispatching thunks
  layout.tsx                  ← PageLayout shell for callLog section
  page.tsx                    ← Overview placeholder page
  _lib/
    baseCallLog.ts            ← base/fallback objects
    callLogServerFunc.ts      ← remap + extend functions (server-side)
    CallLogSearch.ts          ← CallLogSearchRaw + CallLogSearchCriteria types
    remapCallLogSearch.ts     ← maps our criteria type → RealGreen raw search type
  api/
    CallLogContract.ts        ← API contract (getCallLogsForCustomer)
    route.ts                  ← GET /realGreen/callLog/api — reads from RealGreen directly
  models/
    CallLogModel.ts           ← Mongoose model (callLogId natural key, notes embedded)
  sync/
    CallLogSyncContract.ts    ← Sync API contract (syncCallLogs)
    callLogSyncFunc.ts        ← fetchCallLogs(), bulkUpsertCallLogs(), findCallLogSyncEdge()
    api/route.ts              ← POST /realGreen/callLog/sync/api — admin-only sync trigger
```

---

## Data Shape

### The Two RealGreen Endpoints

**`GET /CallLog/Customer/{custId}`**
- Returns all call logs for a single customer, with notes embedded
- Used by `callLog/api/route.ts` for on-demand single-customer fetches
- No pagination needed — returns all logs for one customer

**`POST /CallLog/CallLogSearch`**
- Paginated (max 500 records per page)
- Supports `updated` date range filter — the delta-sync key
- Used by `callLogSyncFunc.ts` for bulk sync operations

### Type Pipeline

```
CallLogNoteRaw → CallLogNoteCore (= CallLogNote)
CallLogRaw     → CallLogCore → CallLogDoc → CallLog
```

Notes are embedded in the parent `CallLogDoc` — not stored in a separate collection.
Natural key: `callLogId`.

### Key Discoveries (Confirmed via Sandbox 2026-09-23)

**`status` on `CallLog`:** Arrives as a human-readable description string (e.g., `"Resolved"`,
`"In Process"`, `"Z_OBS_New Call"`), not a single-character code. The `resolved` boolean is
also already a first-class field on the call log. No lookup table needed.

**`reason` on `CallLogNote`:** Arrives as a human-readable string (e.g., `"Account Update -
In Process"`), not a numeric ID. No lookup table needed.

These discoveries led to the removal of the `callLogStatus` and `callLogReason` sub-modules
that were originally planned.

### Deferred

- **Employee hydration:** `enteredByEmployee` and `assignedToEmployee` on `CallLogProps` are
  deferred until a concrete UI need arises.
- **Write-back to RealGreen:** Not designed. Flagged for future exploration.

---

## Customer Integration

`callLogs: CallLog[]` is added to `CustomerProps` and wired through `makeCustomersSelector`
via `callLogSelect.callLogsByCustId`. When a customer is selected in the UI, their call logs
are available directly on the hydrated `Customer` object.

---

## How We Sync

### Delta-Sync Key

`CallLogSearch` POST supports an `updated` date range filter:
```typescript
{ updated: { minValue: ISO8601, maxValue: ISO8601 } }
```
Each sync fetches only records updated since `lastSyncedAt`.

### Edge-Finding

Unlike customer/program (which use the `/Reporting/[Entity]/Updated` binary search endpoint),
call logs include `notes[].date` in the search response. The edge is computed directly from
the returned data:

```
newLastSyncedAt = max(notes[].date across all returned records) - 5min comfort buffer
```

The 5-minute comfort buffer covers RealGreen's indexing lag. If no notes have dates, falls
back to `syncStart - 5min`. No Reporting endpoint exists for call logs.

### Upsert

`bulkWrite` keyed by `callLogId`. The entire `notes` array is replaced on each upsert —
RealGreen is the source of truth for note content. Re-upserting an already-synced record
is safe and idempotent.

### Orchestration

`syncCallLogs()` runs concurrently with `syncCustomers()`, `syncPrograms()`, and
`syncServices()` inside `runDeltaSync()` in `src/app/realGreen/customer/sync/runDeltaSync.ts`.
The `mirrorSync` Vercel Cron job calls `runDeltaSync()` on an activity-based schedule.

See `src/app/vercelCron/expandedSyncPlan.md` for the full sync architecture.

---

## Switch Points

**There is no client-side pipeline flag for callLog.** The module was built directly into
the mirror pipeline (reads from MongoDB) without a RealGreen API fallback for bulk queries.
This is intentional — the RealGreen `CallLogSearch` endpoint is too slow for UI use at scale.

| Switch point | Location | How to flip |
|---|---|---|
| Disable cron sync | `runDeltaSync.ts` → `Promise.all` | Remove `syncCallLogs()` from the array |
| Manual force-sync | `sync/api/route.ts` | POST `{ op: "syncCallLogs", force: true }` (admin only) |
| Single-customer live fetch | `api/route.ts` | Already available — reads from RealGreen directly |

The `sync/api/route.ts` admin route remains available for manual force-syncs and debugging.
