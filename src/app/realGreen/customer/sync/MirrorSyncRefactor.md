# Mirror Sync Refactor — Delta Sync Edge-Finding

## Problem

The current delta sync in `runDeltaSync.ts` has a race condition that causes records to be
permanently missed:

1. `lastSyncedAt` is read from sync metadata (e.g., `T_prev`)
2. A delta fetch is issued: `updated >= T_prev`
3. `setLastSyncedAt` is called with `now` (`T_now`) — **before** the upsert completes
4. The next sync queries `updated >= T_now`

The gap: any record that was modified before `T_now` but not yet indexed by RealGreen's search
API at the time of the fetch will be permanently missed. RealGreen does not expose the `updated`
field in search results for customers or services, so we cannot compute the true edge from the
fetched records themselves.

---

## Root Cause

We have no visibility into RealGreen's internal indexing lag. A batch operation (e.g., printing
50 services at once) may assign the same `updated` timestamp to all records, but RealGreen may
index them in batches over a window of seconds to minutes. If our sync window closes before all
records are indexed, those records are missed.

---

## Solution: Binary Search on the Reporting Endpoint

RealGreen provides lightweight Reporting endpoints that return only entity IDs (not full records)
for a given update time range:

```
POST /Reporting/Customer/Updated
POST /Reporting/Program/Updated
POST /Reporting/Service/Updated  (assumed — not confirmed in swagger; fallback available)

Body:
{
  "dateTimeRange": {
    "minValue": "2026-09-29T18:00:00.000Z",
    "maxValue": "2026-09-29T18:47:24.000Z"
  }
}

Response: number[]  (array of entity IDs)
```

These are cheap GET-equivalent calls that return only IDs — no pagination, no full record data.

### Algorithm: `findSyncEdge`

After a delta sync completes, we use binary search on the Reporting endpoint to find the latest
timestamp `T*` such that `Reporting(T*, now)` returns an empty array. This is the "true edge" —
the latest point after which no records are known to have been updated.

```
Constants:
  GRANULARITY = 10 minutes (600,000 ms)
  MAX_ITERATIONS = 25  (hard safeguard; log₂(7 years / 10 min) ≈ 19)
  COMFORT_BUFFER = 5 minutes (300,000 ms)

Inputs:
  lo = lastSyncedAt (or HISTORY_FLOOR for initial sync)
  hi = now

Algorithm:
  iterations = 0
  while (hi - lo) > GRANULARITY AND iterations < MAX_ITERATIONS:
    mid = (lo + hi) / 2
    rightIds = POST /Reporting/[Entity]/Updated { dateTimeRange: { min: mid, max: hi } }

    if rightIds.empty:
      break  // lo is the latest known point with records
    else:
      lo = mid  // records exist in right half — advance lo
    
    iterations++

  newLastSyncedAt = lo - COMFORT_BUFFER
  setLastSyncedAt(entityType, { lastSyncedAt: newLastSyncedAt, ... })
```

**Why `lo - COMFORT_BUFFER`?** The binary search finds the latest point where records are
*known* to exist. The comfort buffer (5 min) ensures the next sync re-queries slightly before
that point, catching any records that were modified near `lo` but not yet indexed when the
binary search ran.

### Call Count

| Scenario | Range | Calls |
|---|---|---|
| Normal sync (5 min ago) | 5 min | ~1–2 |
| Synced 1 hour ago | 60 min | ~3 |
| Synced 1 day ago | 1440 min | ~8 |
| Initial sync (7 year range) | ~3.68M min | ~22 |
| Nothing changed | any | 1 (right side empty immediately, loop doesn't run) |

All calls are cheap POST requests returning only IDs. Max 25 calls enforced by `MAX_ITERATIONS`.

### Zero-Change Case

If `Reporting(lo, hi)` returns empty on the first check (nothing changed since last sync),
`lastSyncedAt` is **not updated**. The window stays the same for the next sync.

---

## Initial Sync

On first sync (`lastSyncedAt = null`), a full load is performed (no `updated` filter).
After the full load, `findSyncEdge` runs with:
- `lo = HISTORY_FLOOR` (the hardcoded `new Date().getFullYear() - 7` start date as ISO string)
- `hi = now`

This advances `lastSyncedAt` to just before the most recent actual update, so subsequent syncs
are efficient delta syncs rather than re-fetching the entire history.

---

## Service Endpoint — Confirmed Absent

`/Reporting/Service/Updated` does **not** exist in RealGreen (confirmed: no server log entry
when the endpoint was called, and it is absent from the swagger documentation).

**Workaround:** Services use the program edge as a proxy for their `lastSyncedAt`.

**Hypothesis:** In the RealGreen CRM, services are edited within the program UI. Editing a
service always touches the parent program record, so the program's `updated` timestamp advances
whenever a service changes. This makes the program Reporting endpoint a reliable proxy for
detecting service changes.

**Implementation:** `runDeltaSync` runs all three syncs concurrently. After all complete, it
overwrites the service `lastSyncedAt` with the program edge before writing metadata:

```typescript
const serviceMetadata = {
  ...serviceResult,
  lastSyncedAt: programResult.lastSyncedAt,       // use program edge
  lastSyncEdgeIterations: programResult.lastSyncEdgeIterations,
  lastSyncBufferSeconds: programResult.lastSyncBufferSeconds,
};
```

**Validation:** Test by syncing, immediately editing a service in the CRM, then syncing again.
If the changed service appears in the second sync, the hypothesis is confirmed.

**If the hypothesis fails:** The fallback is to use a fixed buffer for services (e.g., 10 minutes).
This can be implemented by not overriding `serviceResult.lastSyncedAt` and instead computing
`syncStart - FIXED_BUFFER_MS` in `syncServices()`.

---

## SyncMetadata Changes

New diagnostic fields added to `SyncMetadata`:

| Field | Type | Purpose |
|---|---|---|
| `lastSyncCount` | `number` | Records fetched in the last sync |
| `lastSyncEdgeIterations` | `number` | Binary search iterations used to find the edge |
| `lastSyncBufferSeconds` | `number` | Comfort buffer subtracted from the edge timestamp |

These fields allow you to observe sync behavior and tune the buffer/granularity constants.

---

## Files Changed

| File | Change |
|---|---|
| `sync/findSyncEdge.ts` | **New** — Reporting API wrapper + binary search implementation |
| `syncMetadata/SyncMetadataTypes.ts` | Add `lastSyncCount`, `lastSyncEdgeIterations`, `lastSyncBufferSeconds` |
| `syncMetadata/SyncMetadataModel.ts` | Add new fields to Mongoose schema |
| `syncMetadata/syncMetadataFunc.ts` | Update `setLastSyncedAt` to accept new diagnostic fields |
| `sync/runDeltaSync.ts` | Use `findSyncEdge` for customers and programs; service fallback |

---

## Constants (tunable)

All constants are defined at the top of `findSyncEdge.ts`:

```typescript
const GRANULARITY_MS = 10 * 60 * 1000;   // 10 minutes — stop splitting when window < this
const MAX_ITERATIONS = 25;                 // hard cap on Reporting API calls per sync
const COMFORT_BUFFER_MS = 5 * 60 * 1000; // 5 minutes — subtracted from edge before storing
```

Adjust `COMFORT_BUFFER_MS` based on observed RealGreen indexing lag. Larger = safer but
re-fetches more records on each sync. Smaller = more precise but risks missing records if
RealGreen's indexing lag exceeds the buffer.
