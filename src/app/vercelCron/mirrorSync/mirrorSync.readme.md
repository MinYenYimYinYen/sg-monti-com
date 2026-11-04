# Mirror Sync — Vercel Cron

## Overview

The mirror is a MongoDB copy of RealGreen's live data (customers, programs, services, call logs).
It is kept current by a Vercel Cron job that runs `runDeltaSync()` on a dynamic schedule
based on user activity, rather than on a fixed interval.

This replaces the previous approach of running `runDeltaSync()` inline before every mirror
query (which blocked the query and eliminated most of the mirror's speed advantage).

**Delta sync cannot see deletions.** A record deleted in RealGreen never appears in an
`updated` window, so it stays in the mirror forever. The only fix is a **full sync**: wipe the
collections and reload. That is a chunked, password-gated operation driven from the Sync
Utilities page (`/syncUtils`, admin only). See [Full Sync](#full-sync-chunked).

Related docs: `src/app/vercelCron/expandedSyncPlan.md` covers the strategy and the steps for
adding a new synced entity.

---

## How It Works

### Activity Tracking

Every call to `getMirrorCustomers` writes `lastQueriedAt = now` to the `customer`
SyncMetadata document in MongoDB. This write is **fire-and-forget** (not awaited) — it
adds zero latency to the query.

### Cron Job

Vercel calls `GET /vercelCron/mirrorSync/api` every minute (configured in `vercel.json`).

On each tick, the cron endpoint:
1. Reads `lastQueriedAt` from MongoDB
2. Computes `sinceLastQuery = now - lastQueriedAt`
3. Calls `shouldSync(sinceLastQueryMs)` to determine whether to sync this tick
4. If yes: runs `runDeltaSync()` and returns timing info
5. If no: returns immediately (fast path — no DB writes, no RealGreen API calls)

If `runDeltaSync()` reports `skipped` (a sync lock is held, or a full sync is unfinished) the
cron returns `{ synced: false, reason }` with HTTP 200. A held lock is not a failure; the next
tick catches up.

### Tier Schedule

| sinceLastQuery | Sync frequency | Rationale |
|---|---|---|
| 0 – 5 min | Every minute | Users are actively querying — keep mirror fresh |
| 5 – 60 min | Every 5 min | Recent activity — moderate freshness |
| > 60 min | Every 30 min | Low activity — conserve RealGreen API calls |

### The "Stale at 6am" Problem — Solved

At 6am, `sinceLastQuery` might be 8+ hours (cold tier, syncing every 30 min). The first
user query of the day writes `lastQueriedAt = now`. The next cron tick (within 60 seconds)
sees `sinceLastQuery < 5 min` and syncs immediately. The mirror is fresh within 1 minute
of the first query — no manual intervention needed.

---

## What Gets Synced

`runDeltaSync()` syncs all four entity types concurrently on every tick:

| Entity | Edge-finding method |
|---|---|
| Customer | Binary search on `/Reporting/Customer/Updated` |
| Program | Binary search on `/Reporting/Program/Updated` |
| Service | Uses program edge as proxy (no `/Reporting/Service/Updated` endpoint) |
| CallLog | Max `notes[].date` across returned records (no Reporting endpoint needed) |

See `src/app/realGreen/customer/sync/runDeltaSync.ts` for the orchestrator.

`runDeltaSync({ groups? })` takes a lock per sync group (see [Locks](#locks)), runs the groups
concurrently, and returns `{ skipped: true, reason }` or `{ skipped: false, durationMs, syncedCounts }`.
It never throws because of a held lock; callers decide what a skip means (the cron ignores it, the
mirror route turns it into an error).

---

## Sync Gap Safety

The delta sync algorithm is designed to never introduce gaps:

- `lastSyncedAt` is advanced using the true edge (binary search or max note date), not `now`.
  This finds the latest point where records are known to exist and subtracts a 5-minute comfort buffer.
- The comfort buffer ensures the next sync re-queries a window that slightly overlaps the
  previous one, catching any records that were indexed by RealGreen after the last sync ran.
- Zero-record syncs leave `lastSyncedAt` unchanged — the same window is re-queried next time.
- If the cron misses a tick (deployment gap, cold start), the next tick catches up by
  fetching everything since `lastSyncedAt`. The window just gets larger; no gap is created.

### Why not store `now`

RealGreen does not return `updated` on customer or service search results, so the true edge
cannot be read from the fetched records. Storing `now` would permanently miss records that were
modified just before the window closed but were not yet indexed by RealGreen's search.

### Edge finding (`customer/sync/findSyncEdge.ts`)

Binary search on `POST /Reporting/[Entity]/Updated` (returns IDs only, no pagination) for the
latest point after which nothing was updated, then subtract the comfort buffer. The algorithm,
its constants (`GRANULARITY_MS`, `MAX_ITERATIONS`, `COMFORT_BUFFER_MS`) and the call-count math are
documented in the file's JSDoc. Two behaviors worth knowing:

- If the first check finds nothing updated in the whole window, `lastSyncedAt` is left unchanged.
- With no previous `lastSyncedAt` (initial load or after a wipe), the lower bound is the start of
  the oldest synced season (`getSyncSeasonWindow().historyFloorIso`, `syncMetadata/syncWindow.ts`).

### Service proxy (and its fallback)

`/Reporting/Service/Updated` does not exist, so services reuse the program edge. This rests on
the observation that editing a service in the CRM also bumps the parent program's `updated`.
If that ever stops being true, the fallback is a fixed buffer for services: stop overwriting the
service `lastSyncedAt` with the program edge in `runDeltaSync`, and have `syncServices()` return
`syncStart - FIXED_BUFFER_MS` (for example 10 minutes) instead.

### Corrupted records

RealGreen sometimes throws `"Nullable object must have a value."` for a page containing a
corrupted record. The fetch functions recover with `binarySearchCorruptedRecord`, skip the bad
record, and store the IDs of the records on either side in the `CorruptedSyncRecord` collection
(one document per hit, grouped by a shared timestamp per sync). The sandbox page
`/sandbox/corruptedRecords` shows them so the records can be found and fixed in the CRM.
Service records whose production data fails to remap are skipped and logged in `bulkUpsertServices`.

---

## Fallback: syncFirst

The `getMirrorCustomers` contract accepts an optional `syncFirst?: boolean` param.
When `true`, the mirror route runs `runDeltaSync()` inline before executing the query plan
(the old behavior).

**Use cases:**
- Cron job is misconfigured or not yet deployed — set `syncFirst: true` in the hook to
  keep the app working immediately.
- A specific context requires absolutely fresh data regardless of cron timing.

**To re-enable sync-before-query globally:** add `syncFirst: true` to the params in the
relevant hook's dispatch call. One line of code restores the old behavior.

If a lock is held when `syncFirst` runs, the route throws the operational 409 error from the lock
reason instead of querying a mirror that may be mid-rebuild.

---

## Locks

Source: `src/app/realGreen/syncLock/`. One document per **sync group** in the `SyncLock` collection:

| Group | Entities | Why grouped |
|---|---|---|
| `customerGroup` | customer, program, service | Service borrows the program edge, and mirror queries join all three |
| `callLog` | callLog | Independent; no mirror query reads it |

- **Lease, not a flag.** Acquiring is one atomic `findOneAndUpdate` that succeeds only if there is
  no holder or `expiresAt` has passed. `LOCK_LEASE_MS` is 15 minutes (longer than the route's
  `maxDuration`, so a live request never loses its lease). A request killed without cleanup
  frees the group when the lease expires.
- **Release by owner.** `releaseLock` only clears the lease if `holderRunId` still matches, so a
  slow run whose lease expired cannot free a lock another run has since taken.
- **Delta sync** takes the lease for every requested group up front and skips (does not queue) if
  any is held. The next cron tick catches up.
- **Full-sync state outlives the lease.** The group document also stores `fullRun`, the persisted
  state of an unfinished full sync. While it exists, delta syncs refuse to acquire the lock.
- **Admin escape hatch.** `clearSyncLock` always frees the lease; with `abandonRun` it also discards
  an unfinished full sync (afterwards a delta sync does a normal initial load).

### Mirror queries during a rebuild

`getMirrorCustomers` calls `assertMirrorAvailable()` first. While the customer group has an
unfinished `fullRun` (or an active full-sync lease) it throws a 409 operational error, because
the collections are empty or partial and an empty result would look like missing customers.
Call logs are not covered; no mirror query depends on them. Cost: one indexed Mongo read per query.

---

## Full Sync (chunked)

Entry point: the Sync Utilities page, `src/app/syncUtils/` (admin only; tabs for Customers and
Call Logs; each tab has Run Delta Sync and Full Sync). Server logic: `customer/sync/runFullSync.ts`.
API: `POST /syncUtils/api` (`getSyncStatus`, `runDeltaSync`, `startFullSync`, `runFullSyncChunk`,
`clearSyncLock`), all admin-only.

### Flow

1. **Start** (`startFullSync`): the server verifies the password (re-entered in the dialog; checked
   server-side, so calling the API directly cannot skip it), acquires the lock, persists the run,
   **clears `lastSyncedAt` first**, then deletes the collections.
2. **Chunks** (`runFullSyncChunk`, one HTTP request each, driven in order by the page):
   - customers (no season, one chunk);
   - programs, one chunk per season from `currentYear - 7` to `currentYear`, plus one chunk for all
     future seasons (they are sparse; usually only next season is populated);
   - services, same season chunks;
   - **finalize**: finds the sync edges and writes the checkpoints.
   Call logs have one data chunk and write their own checkpoint (their edge comes from the data).
3. **Close**: after the last step the run is deleted from the lock document, which reopens the
   mirror to queries and delta syncs.

### Why it works this way

- **Clear checkpoints before deleting.** If the request dies between the two, `lastSyncedAt` is
  already null, so no delta sync can mistake a half-empty mirror for an up-to-date one.
- **Chunks are separate requests** so total time is not bounded by one function's `maxDuration`
  (800 s, the Pro plan ceiling with fluid compute; exported from `syncUtils/api/route.ts`). Each
  chunk only has to fit one season's load, so growth in total history does not threaten the limit.
- **Edges use the run's start time**, not now: `findSyncEdge(floor, run.startedAt)`. Anything that
  changed while the full sync ran is re-fetched by the next delta. Service uses the program edge.
- **Resume.** Progress is saved before and after each chunk. A failed or interrupted chunk is simply
  run again; every write is an idempotent upsert. Chunks must run in order (`findChunkBlocker`).
- **The wipe only runs from `startFullSync`.** A resume can never delete data, and the password
  gate sits directly in front of the only destructive step.
- A run whose wipe never completed deleted nothing and is replaced by a new start. Once the wipe
  is done, starting over requires an explicit Abandon.

### Errors

Sync failures are rethrown as operational `AppError`s (`EXTERNAL_ERROR`, 502) naming the step and
the underlying message, so the page can show them inline; the full stack goes to the server console.
A held lock is a 409 with the reason. A platform timeout returns no JSON at all; the page tells the
user to run the step again, and the lock frees when its lease expires.

### Season window

`getSyncSeasonWindow()` (`syncMetadata/syncWindow.ts`) is the single definition of the synced
seasons (current year -7 to +7). Delta sync and full sync both read it so they always cover the
same records.

---

## Setup

### 1. vercel.json (already configured)

```json
{
  "crons": [
    {
      "path": "/vercelCron/mirrorSync/api",
      "schedule": "* * * * *"
    }
  ]
}
```

`"* * * * *"` = every minute. Requires Vercel Pro plan (minimum interval on Hobby is 1/day).

### 2. CRON_SECRET environment variable

Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` on every cron request.
The endpoint validates this header to reject unauthorized callers.

**To set up:**
1. Go to your Vercel project → Settings → Environment Variables
2. Add `CRON_SECRET` with a random secret (e.g., `openssl rand -hex 32`)
3. Select all environments (Production, Preview, Development)
4. Redeploy

**For local development:** Add `CRON_SECRET=any-local-secret` to `.env.local`.
You can then test the cron endpoint manually:
```
curl -H "Authorization: Bearer any-local-secret" http://localhost:3000/vercelCron/mirrorSync/api
```

---

## Files

```
src/app/vercelCron/mirrorSync/
  mirrorSync.readme.md        ← this document
  syncSchedule.ts             ← shouldSync() tier logic
  api/
    route.ts                  ← GET handler (Vercel Cron endpoint)

vercel.json                   ← cron schedule config (project root)
```

**Related files:**
```
src/app/realGreen/syncMetadata/
  SyncMetadataTypes.ts        ← lastQueriedAt field
  SyncMetadataModel.ts        ← lastQueriedAt in schema
  syncMetadataFunc.ts         ← recordMirrorQuery(), clearLastSyncedAt()
  syncWindow.ts               ← getSyncSeasonWindow(): shared season window

src/app/realGreen/syncLock/
  syncGroups.ts               ← SYNC_GROUPS, entity membership, labels
  SyncLockTypes.ts            ← lock doc, FullSyncRun / FullSyncChunk, client status types
  SyncLockModel.ts            ← SyncLock collection
  syncLockLogic.ts            ← pure: lease expiry, chunk planning, ordering checks
  syncLockFunc.ts             ← acquire / release / force clear / assertMirrorAvailable

src/app/realGreen/customer/mirror/
  CustomerMirrorContract.ts   ← syncFirst?: boolean param
  api/route.ts                ← assertMirrorAvailable(), recordMirrorQuery(), syncFirst gate

src/app/realGreen/customer/sync/
  runDeltaSync.ts             ← lock + concurrent entity syncs, returns DeltaSyncResult
  runFullSync.ts              ← startFullSync (wipe) and runFullSyncChunk
  findSyncEdge.ts             ← Reporting binary search

src/app/syncUtils/            ← admin page, API route + contract, chunk-loop hook
```

---

## Tuning

All tier thresholds are constants at the top of `syncSchedule.ts`:

```typescript
const TIER_ACTIVE_MS     =  5 * 60 * 1000; //  5 min — sync every minute
const TIER_WARM_MS       = 60 * 60 * 1000; // 60 min — sync every 5 min
const INTERVAL_WARM_MIN  =  5;              // minutes between syncs in warm tier
const INTERVAL_COLD_MIN  = 30;             // minutes between syncs in cold tier
```

Adjust these based on observed RealGreen API usage and business freshness requirements.
