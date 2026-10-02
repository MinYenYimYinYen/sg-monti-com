# Mirror Sync — Vercel Cron

## Overview

The mirror is a MongoDB copy of RealGreen's live data (customers, programs, services, call logs).
It is kept current by a Vercel Cron job that runs `runDeltaSync()` on a dynamic schedule
based on user activity, rather than on a fixed interval.

This replaces the previous approach of running `runDeltaSync()` inline before every mirror
query (which blocked the query and eliminated most of the mirror's speed advantage).

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

See `src/app/realGreen/customer/sync/MirrorSyncRefactor.md` for the full algorithm.

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
  syncMetadataFunc.ts         ← recordMirrorQuery() helper

src/app/realGreen/customer/mirror/
  CustomerMirrorContract.ts   ← syncFirst?: boolean param
  api/route.ts                ← fire-and-forget recordMirrorQuery(), syncFirst gate

src/app/realGreen/customer/sync/
  runDeltaSync.ts             ← orchestrates all four entity syncs concurrently
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
