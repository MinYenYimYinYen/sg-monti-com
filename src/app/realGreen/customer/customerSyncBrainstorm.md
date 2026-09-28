# Customer Sync Brainstorm

This document captures the architectural analysis and decisions made during the planning session for syncing Customer, Program, and Service data from RealGreen into MongoDB.

---

## Context

The current data pipeline fetches Customer/Program/Service data live from the RealGreen API on every request using a streaming SearchScheme pipeline. This works but is slow (up to 30 seconds for a full load) and complex (stepFactories, binaryIdSearch, binaryOffsetSearch, pagination optimizer).

The callLog sync (Phase 1–3 of the callLog initiative) proved the sync pattern works. This document explores applying the same pattern to the core customer pipeline.

---

## The Core Idea: Sync-Before-Read

Instead of fetching from RealGreen on every request, the route handler would:

1. **Delta sync** — fire `syncCustomers()`, `syncPrograms()`, `syncServices()` concurrently, each using the `updated` filter from their respective `lastSyncedAt`
2. **Await all three** — total time ≈ ~500ms–1.5s (vs. current 30s)
3. **Mongo query** — run the scheme's equivalent Mongo query (replaces the pipeline)
4. **Stream results** — same `StreamChunk` format, same client behavior, progressive rendering preserved

### Why Not a Cron Instead?

A cron was considered but sync-before-read is better here because:
- Delta syncs are cheap: in a 4-hour window, typically 1 RealGreen call per entity (500ms each)
- The user always gets fresh data — no staleness window
- No cron infrastructure needed for the read path
- Current load time is 30s; sync-before-read brings it to ~2s total

A cron could still be added as a bonus (pre-warming the cache), but it's not required.

---

## What This Eliminates (Eventually)

Once all schemes are migrated, the following can be retired:
- `searchSchemes/schemeExecution/stepFactories.ts`
- `searchSchemes/schemeExecution/binaryIdSearch.ts`
- `searchSchemes/schemeExecution/binaryOffsetSearch.ts`
- `SearchOptimizerModel` and the optimizer DB reads/writes
- The streaming generator loop in `route.ts`
- The binary search error recovery (corrupted RealGreen records don't make it into Mongo)

**The existing pipeline stays in place and untouched** — the new path is additive inside the route handler.

---

## Handoff Point: The Route Handler

The correct seam is inside `route.ts`, not the hook, contract, slice, or thunk. The client doesn't know or care whether data came from RealGreen or Mongo — the `StreamChunk` format is identical.

### Migration Control

Add `dataSource: "live" | "synced"` to the `SearchScheme` type. The route handler checks this early:
- `"synced"` → parallel delta sync + Mongo query
- `"live"` → existing pipeline (no change)

This enables per-scheme migration. Flip one scheme at a time, validate, then proceed.

---

## Syncable Entities

All three customer-pipeline entities inherit `RGSearchBase` which has `updated?: RGStringRange` and `created?: RGStringRange`. These are currently commented out in the search types but the RealGreen API supports them — uncommenting is all that's needed.

| Entity | Search Type | `updated` filter | Notes |
|---|---|---|---|
| Customer | `CustomerSearchRaw` | commented out — available | Uncomment to enable delta sync |
| Program | `ProgramSearchRaw` | commented out — available | Uncomment to enable delta sync |
| Service | `ServiceSearchRaw` | commented out — available | Uncomment to enable delta sync |

Non-syncable entities (Company, Employee, Flag, ZipCode, etc.) have no search API with pagination — they stay as live fetches.

---

## Storage Decision: Store Core (Doc), Not Raw

**Decision: Store the remapped Core/Doc shape (camelCase, cleaned), consistent with the rest of the app.**

### Rationale
- Consistent with `CallLogModel` and all other Mongo collections in this app
- Smaller storage — only fields actually used
- Clean Mongoose schemas with proper TypeScript types
- Re-sync risk is low: a full re-sync takes ~1–3 minutes if a new field is needed later

### ⚠️ Action Required Before Implementation

**Carefully review the commented-out fields in `CustomerRaw`, `ProgramRaw`, and `ServiceRaw` and decide which ones you might plausibly need in the next 1–2 years.**

Adding a field to Core now costs almost nothing in storage but saves a full re-sync later. Fields to consider:

**CustomerRaw candidates:**
- `customerMemo` — useful for call log context or notes display
- `customerRoute` — useful for scheduling/routing features
- `customerTechNote` — tech-facing notes
- `customerSource` — acquisition source, useful for reporting
- `customerReferenceID` — external reference, might be needed for integrations

**ProgramRaw candidates:**
- `cancelCode` / `cancelDate` — useful for churn analysis
- `isAutoRenew` — useful for renewal reporting
- `soldBy1` / `soldBy2` — useful for sales attribution
- `sourceCode` — acquisition source

**ServiceRaw candidates:**
- `invoiceNumber` — useful for billing reconciliation
- `isPaid` — useful for AR reporting
- `posted` — posting date, useful for accounting
- `price` / `nextPrice` — useful for revenue analysis beyond what's currently captured
- `round` / `sequence` — useful for route optimization

Review these against your current and planned features before finalizing the Mongoose schemas.

---

## Storage Estimates (M2 Plan, 2 GB)

With a **7-year season floor** on the initial sync:

| Entity | Count | Compressed |
|---|---|---|
| Customers | ~200,000 | ~170 MB |
| Programs | ~70,000 | ~28 MB |
| Services (7 yrs) | ~105,000 | ~140 MB |
| **Total** | | **~340 MB** |

Growth rate: ~15,000 services/year → ~20 MB/year compressed. M2 (2 GB) provides decades of headroom.

### TTL Index on Services

Add a TTL index to auto-expire services older than 8 years, keeping the rolling 7-year window:

```typescript
// Computed field on upsert: expiresAt = Jan 1 of (serviceYear + 8)
ServiceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

No TTL on customers or programs — they're small and needed for context.

### Atlas Behavior at Storage Limit

Atlas does **not** silently corrupt data. At the storage limit, the cluster goes read-only. Atlas sends email warnings at 75% and 90% capacity. You'll have time to react.

---

## Initial Sync Strategy

- **Season floor**: Only sync records where `serviceYear >= currentYear - 7`
- **Trigger**: Manual `force: true` call to the sync endpoint (one-time)
- **Estimated time**: ~1–3 minutes total (parallelized across entities)
- **Subsequent syncs**: Delta only, ~500ms–1.5s per request

---

## Concurrent Request Concern

If multiple users hit `runSearchScheme` simultaneously, each would trigger a delta sync. For v1 this is acceptable — delta syncs are cheap and bounded. A future optimization is a **sync lock** (module-level promise or `syncMetadata` flag) so concurrent requests share one sync operation.

---

## refreshCustomer Simplification

Currently: re-runs the full scheme pipeline for one customer, filters to that custId.

With sync-before-read:
1. Sync customers/programs/services with `customerID: [custId]` filter
2. Re-query Mongo for that custId
3. Return the docs

Much simpler, and the data is guaranteed fresh.

---

## Implementation Order (Suggested)

1. **Review Raw types** — decide which fields to include in Core (see ⚠️ above)
2. **Create Mongoose models** — `CustomerModel`, `ProgramModel`, `ServiceModel` with appropriate indexes
3. **Register entity types** in `syncEntityTypes.ts`
4. **Create sync functions** — `customerSyncFunc.ts`, `programSyncFunc.ts`, `serviceSyncFunc.ts` (same pattern as `callLogSyncFunc.ts`)
5. **Uncomment `updated` filter** in `CustomerSearchRaw`, `ProgramSearchRaw`, `ServiceSearchRaw`
6. **Add `dataSource` to `SearchScheme` type**
7. **Add Mongo query functions** for `activeCustomers` scheme (proof of concept)
8. **Update route handler** to dispatch based on `dataSource`
9. **Validate** — compare Mongo query results against current pipeline output for the same season
10. **Migrate remaining schemes** one at a time
