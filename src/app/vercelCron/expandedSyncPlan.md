# Expanded Sync Plan — RealGreen Mirror Strategy

## Overview

This document describes the long-term strategy for syncing RealGreen data into MongoDB
(the "mirror") and the principles that govern how new data types are added to the sync pipeline.

The mirror exists to make RealGreen data fast, queryable, and available without hitting the
RealGreen API on every request. The sync pipeline keeps it current.

---

## Cron Architecture

Two categories of cron jobs are planned:

### 1. `mirrorSync` — Live Data (every minute, activity-based)

**Path:** `src/app/vercelCron/mirrorSync/`
**Schedule:** `* * * * *` (every minute, Vercel Pro required)
**Behavior:** Activity-based tier schedule — syncs more frequently when users are active.

| sinceLastQuery | Sync frequency |
|---|---|
| 0–5 min | Every minute |
| 5–60 min | Every 5 min |
| >60 min | Every 30 min |

**Currently syncing:**
- Customer (binary search edge-finding via `/Reporting/Customer/Updated`)
- Program (binary search edge-finding via `/Reporting/Program/Updated`)
- Service (uses program edge as proxy — `/Reporting/Service/Updated` does not exist)
- CallLog (max `notes[].date` across returned records — no Reporting endpoint needed)

**Fallback:** `syncFirst?: boolean` param on `getMirrorCustomers` — set to `true` in the hook
to force a sync before any query. One-line escape hatch if the cron is misconfigured.

### 2. `metadataSync` — Slow-Changing Data (future, hourly or nightly)

**Path:** `src/app/vercelCron/metadataSync/` ← stub exists, not yet implemented
**Schedule:** TBD (likely `0 * * * *` for hourly, or `0 6 * * *` for nightly)
**Behavior:** Fixed schedule, no activity tracking needed.

**Candidates (not yet implemented):**
- Service codes, program codes, employee data, zip codes, etc.
- Data that changes rarely and doesn't need minute-level freshness

---

## Switch Points

Every synced entity must document its switch points — the places in code where you can
flip between the mirror pipeline and the live RealGreen API.

### Customer / Program / Service

| Switch point | Location | How to flip |
|---|---|---|
| Pipeline flag | `customerSlices.ts` → `PIPELINE` constant | Change `"mirror"` → `"realGreen"` per context |
| Sync-before-query | `CustomerMirrorContract.ts` → `syncFirst?: boolean` | Set `syncFirst: true` in hook dispatch params |
| Cron endpoint | `vercel.json` → `/vercelCron/mirrorSync/api` | Remove or disable the cron entry |

**Contexts permanently on mirror (no flag):** `"corruptedRecords"`, `"customerQuery"`

**Contexts on mirror via PIPELINE flag (can be flipped):**
`active`, `byAssignment`, `fullSeasonServices`, `lastSeasonProduction`,
`multiSeasonProduction`, `printed`, `priorityService`, `recentProduction`, `single`

### CallLog

| Switch point | Location | How to flip |
|---|---|---|
| Manual sync route | `callLog/sync/api/route.ts` | POST `{ op: "syncCallLogs" }` (admin only) |
| Cron (via runDeltaSync) | `runDeltaSync.ts` → `syncCallLogs()` | Remove from `Promise.all` in orchestrator |

**Note:** CallLog has no client-side pipeline flag yet — it was implemented directly into the
mirror pipeline without a RealGreen API fallback. If a fallback is needed, it would require
adding a `useCallLog` hook that reads from the RealGreen API directly.

---

## Adding a New Entity to the Mirror

Add entities one at a time. For each new entity:

### Step 1 — Determine the sync strategy

The RealGreen API is not consistent. Before implementing, answer:
- Does the entity have an `updated` date range filter in its search endpoint?
- Does the entity appear in a `/Reporting/[Entity]/Updated` endpoint?
- Does the entity's response include a timestamp we can use for edge-finding?
- Is the entity a "live" entity (changes during business hours) or "metadata" (rarely changes)?

This determines which cron job it belongs to and how `lastSyncedAt` is advanced.

### Step 2 — Implement the sync function

Follow the pattern in `callLog/sync/callLogSyncFunc.ts` or `customer/sync/customerSyncFunc.ts`:
- `fetch[Entity](rawSearch)` — paginated batch fetch
- `bulkUpsert[Entity](rawEntities)` — MongoDB bulkWrite keyed by natural key
- Edge-finding: binary search (Reporting endpoint), max timestamp from response, or fixed buffer

### Step 3 — Add to `runDeltaSync()`

Add a `sync[Entity]()` function and include it in the `Promise.all` in `runDeltaSync.ts`.
Write metadata at the end alongside the other entities.

### Step 4 — Document the switch points

Add a row to the Switch Points table above. Every synced entity must have a documented
way to disable or bypass the sync.

### Step 5 — Register in `SYNC_ENTITY_TYPES`

Add the entity to `syncEntityTypes.ts` so `getLastSyncedAt` / `setLastSyncedAt` can track it.

---

## What We Are NOT Solving Yet

### Relationship data (many-to-many keys)

Example: `custFlag` — customer-to-flag associations. These are not entities with natural keys
and `updated` timestamps. Syncing them requires a different strategy (full reload, diff-based,
or event-driven). Do not attempt to sync relationship data using the delta-sync pattern.

### Metadata entities

Service codes, program codes, employee data, etc. These change rarely and don't need the
activity-based cron. They belong in `metadataSync` when that cron is implemented.

### custFlag and similar

The sync strategy for many-to-many relationship data is unknown and must be determined
case-by-case. Do not add these to `runDeltaSync` without a clear plan.

---

## Principles

1. **Add one at a time.** Don't batch multiple new entities into a single PR.
2. **Document switch points first.** Before implementing, know how to turn it off.
3. **The algorithm must not introduce gaps.** Use edge-finding (binary search, max timestamp,
   or fixed buffer) — never store `now` as `lastSyncedAt`.
4. **Zero-record syncs leave `lastSyncedAt` unchanged.** The same window is re-queried next time.
5. **Missed cron ticks are self-healing.** The next tick catches up by fetching everything
   since `lastSyncedAt`. No manual intervention needed.
6. **The RealGreen API is not great.** How to sync will be determined case-by-case depending
   on what data is available and can be trusted.
