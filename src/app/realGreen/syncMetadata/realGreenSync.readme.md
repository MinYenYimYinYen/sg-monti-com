# RealGreen Sync Architecture

## 1. Why Sync?

The RealGreen API is the source of truth for call logs, customers, programs, and services. Calling it on every UI request is:

- **Slow** — RealGreen API latency × N pages per query
- **Fragile** — any RealGreen outage breaks the feature
- **Limited** — RealGreen's search criteria constrain what queries are possible
- **Wasteful** — most data hasn't changed since the last fetch

The correct architecture is:
1. A **sync operation** runs on a schedule (or on-demand), fetching from RealGreen and upserting to MongoDB
2. **UI routes read from MongoDB** — fast, reliable, queryable in any way

---

## 2. The Delta-Sync Key

Every major RealGreen search endpoint supports an `updated` date range filter:

```typescript
// Example: CallLogSearchRaw
type CallLogSearchRaw = {
  updated?: RGStringRange;  // { minValue: ISO8601, maxValue: ISO8601 }
  // ...
};
```

This means we can query: *"give me all records updated since `lastSyncedAt`."*

**Delta-sync loop:**
1. **Initial full load** — fetch all records (no `updated` filter), upsert to Mongo, record `lastSyncedAt`
2. **Subsequent syncs** — fetch with `updated.minValue = lastSyncedAt`, upsert only changed records, update `lastSyncedAt`

---

## 3. Pagination: Capped Exponential Batch Fetch

RealGreen search endpoints cap at 500 records per page. Rather than fetching pages sequentially (slow for large datasets) or firing unlimited concurrent requests (risk of rate-limiting), we use a **capped exponential batch fetch**.

### Algorithm

**Constants:**
- `PAGE_SIZE = 500`
- `MAX_CONCURRENT = 8`

**Each round:**
1. Build `batchCount` requests with offsets `offset + (i × PAGE_SIZE)` for `i = 0..batchCount-1`
2. Fire all requests concurrently (`Promise.all`)
3. If **any** result has `< PAGE_SIZE` records → done (discard results from batches after the short one)
4. Upsert all valid results to Mongo
5. Advance `offset += batchCount × PAGE_SIZE`
6. `batchCount = Math.min(batchCount × 2, MAX_CONCURRENT)`
7. Repeat until done

### Why This Pattern

- **Self-calibrating** — no need to know total record count upfront
- **Fast for small datasets** — terminates in 1–3 rounds for typical delta syncs
- **Scales for large datasets** — reaches max concurrency quickly and sustains it
- **Safe for RealGreen** — concurrency is bounded; no risk of overwhelming the API
- **Works identically for initial and delta syncs** — the `updated` filter handles the delta case transparently

### Example: callLog (small dataset, 1,750 records)

| Round | Batches | Offsets | Results | Done? |
|---|---|---|---|---|
| 0 | 1 | 0 | 500 | No |
| 1 | 2 | 500, 1000 | 500, 500 | No |
| 2 | 4 | 1500, 2000, 2500, 3000 | 250, 0, 0, 0 | Yes |

Total: 7 requests, max 4 concurrent.

### Example: callLog (delta sync, 50 changed records)

- Round 0: 1 batch returns 50. Done immediately.
- Total: 1 request.

---

## 4. Upsert Strategy

Each entity is upserted by its **natural key** (e.g., `callLogId`). The entire document is replaced on each upsert — RealGreen is the source of truth for content.

Use `bulkWrite` for sync operations (single Mongo command, efficient for large batches):

```typescript
await EntityModel.bulkWrite(
  cores.map((core) => ({
    updateOne: {
      filter: { entityId: core.entityId },
      update: { $set: core },
      upsert: true,
    },
  })),
);
```

---

## 5. SyncMetadata Collection

The `syncMetadata` MongoDB collection tracks when each entity type was last synced. There is exactly **one document per entity type**.

### Type

```typescript
type SyncMetadata = CreatedUpdated & {
  entityType: SyncEntityType;  // natural key — e.g. "callLog"
  lastSyncedAt: string;        // ISO 8601 timestamp of last successful sync
};
```

### Entity Type Registry

All valid entity types are defined in `syncEntityTypes.ts`:

```typescript
export const SYNC_ENTITY_TYPES = {
  callLog: "callLog",
  // customer: "customer",   ← add here when customer sync is implemented
  // program: "program",
  // service: "service",
} as const;
```

### Helper Functions (`syncMetadataFunc.ts`)

```typescript
// Returns lastSyncedAt for the entity, or null if never synced (triggers full load)
getLastSyncedAt(entityType: SyncEntityType): Promise<string | null>

// Persists the new lastSyncedAt after a successful sync
setLastSyncedAt(entityType: SyncEntityType, lastSyncedAt: string): Promise<void>
```

### API Route

`POST /realGreen/syncMetadata/api` — `getAll` operation (admin only).
Returns all `SyncMetadata` documents. Used by the future admin sync status page.

---

## 6. File Structure Per Entity

Each entity that participates in the sync pipeline follows this pattern:

```
src/app/realGreen/[entity]/
  sync/
    [entity]SyncFunc.ts       ← fetch[Entity]s() + bulkUpsert[Entity]s()
    [Entity]SyncContract.ts   ← syncXxx({ force? }) → { synced, lastSyncedAt }
    route.ts                  ← createRpcHandler, admin-only
```

The sync route:
1. Calls `getLastSyncedAt(SYNC_ENTITY_TYPES.[entity])` to determine the sync window
2. Builds search criteria (delta or full)
3. Calls `remapXxxSearch(criteria)` to produce the RealGreen-compatible body
4. Calls `fetchXxx(rawSearch)` — the paginated batch fetch
5. Calls `bulkUpsertXxx(rawLogs)` — the MongoDB bulk write
6. Calls `setLastSyncedAt(SYNC_ENTITY_TYPES.[entity], newTimestamp)`

### Example: callLog

```
src/app/realGreen/callLog/
  sync/
    callLogSyncFunc.ts        ← fetchCallLogs(), bulkUpsertCallLogs()
    CallLogSyncContract.ts    ← syncCallLogs({ force? }) → { synced, lastSyncedAt }
    route.ts                  ← POST /realGreen/callLog/sync/api
```

---

## 7. Adding a New Entity to the Sync Pipeline

1. **Register the entity type** in `syncEntityTypes.ts`:
   ```typescript
   export const SYNC_ENTITY_TYPES = {
     callLog: "callLog",
     customer: "customer",   // ← add this
   } as const;
   ```

2. **Create the sync folder** inside the entity's module:
   ```
   src/app/realGreen/customer/sync/
     customerSyncFunc.ts
     CustomerSyncContract.ts
     route.ts
   ```

3. **Implement `fetchCustomers(rawSearch)`** — same capped exponential batch algorithm, using the customer search endpoint.

4. **Implement `bulkUpsertCustomers(rawCustomers)`** — `bulkWrite` keyed by `custId`.

5. **Wire the route** — same pattern as `callLog/sync/route.ts`, using `SYNC_ENTITY_TYPES.customer`.

---

## 8. Sync Trigger Options

| Option | Pros | Cons |
|---|---|---|
| **On-demand API route** (current) | Simple, easy to test | Must be manually triggered |
| **Vercel Cron** | Automated, no user action | Requires Vercel deployment config |
| **External scheduler** (AWS EventBridge, etc.) | Runs independently | Infrastructure complexity |

**Current approach:** On-demand API route at `POST /realGreen/[entity]/sync/api`. Trigger with `{ op: "syncCallLogs" }` (delta) or `{ op: "syncCallLogs", force: true }` (full reload).

**Future:** Wire to Vercel Cron once the sync is validated in production.

---

## 9. Relationship to Customer/Program/Service Sync

The same delta-sync pattern applies to the customer pipeline:
- `CustomerSearch`, `ProgramSearch`, `ServiceSearch` all support `updated` date range filtering
- The `SyncMetadata` model tracks `lastSyncedAt` for each entity type
- The pagination loop is identical
- The `bulkWrite` upsert strategy is identical

The customer/program/service sync is implemented and active — it runs automatically before every
mirror query (`runDeltaSync` in `src/app/realGreen/customer/sync/runDeltaSync.ts`).

---

## 10. Delta Sync Edge-Finding (Customer Pipeline)

The basic delta-sync loop has a race condition: storing `now` as `lastSyncedAt` after a fetch
can permanently miss records that were modified just before the sync window closed but not yet
indexed by RealGreen's search API.

**Solution:** After each sync, a binary search on RealGreen's `POST /Reporting/[Entity]/Updated`
endpoint finds the true "edge" — the latest timestamp after which no records are known to have
been updated. `lastSyncedAt` is set to `edge - COMFORT_BUFFER` rather than `now`.

### Reporting Endpoints

```
POST /Reporting/Customer/Updated   ← confirmed available
POST /Reporting/Program/Updated    ← confirmed available
POST /Reporting/Service/Updated    ← does NOT exist
```

Body: `{ "dateTimeRange": { "minValue": ISO8601, "maxValue": ISO8601 } }`
Response: `number[]` (array of entity IDs updated in that window)

These are cheap calls — no pagination, IDs only.

### Binary Search Algorithm

```
lo = lastSyncedAt (or HISTORY_FLOOR for initial sync)
hi = now
GRANULARITY = 10 minutes
MAX_ITERATIONS = 25

while (hi - lo) > GRANULARITY AND iterations < MAX_ITERATIONS:
  mid = (lo + hi) / 2
  rightIds = POST /Reporting/[Entity]/Updated { min: mid, max: hi }
  if rightIds.empty: break   // lo is the answer
  else: lo = mid             // advance lo

newLastSyncedAt = lo - COMFORT_BUFFER (5 minutes)
```

**Call count:** log₂(range / granularity), capped at 25. Typically 1–7 for normal syncs.

### Service Proxy

Since `/Reporting/Service/Updated` does not exist, services use the program edge as a proxy.
Confirmed by testing: editing any service field in the RealGreen CRM also updates the parent
program's `updated` timestamp. The program Reporting endpoint is therefore a reliable proxy
for detecting service changes.

### SyncMetadata Diagnostic Fields

`SyncMetadata` now includes three diagnostic fields per entity:

| Field | Purpose |
|---|---|
| `lastSyncCount` | Records fetched in the last sync |
| `lastSyncEdgeIterations` | Binary search iterations used |
| `lastSyncBufferSeconds` | Comfort buffer subtracted from the edge |

See `src/app/realGreen/customer/sync/MirrorSyncRefactor.md` for full documentation.

### Metadata Write Pattern

All three sync functions run concurrently. Each returns a `SyncResult` without writing to the DB.
After all three complete, `runDeltaSync` writes all metadata at once — only for entities that
fetched records (zero-record syncs leave `lastSyncedAt` unchanged).
