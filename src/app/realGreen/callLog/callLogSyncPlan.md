
# CallLog Sync Plan

## Required Reading

> **For future agents starting a new session on this task:**
> On your first prompt, read **only** the files listed below before responding. Do not read other files unless a specific question in the conversation requires it. These files provide sufficient context to continue the sync implementation.

### This Module
| File | Purpose |
|---|---|
| `src/app/realGreen/callLog/callLogSyncPlan.md` | (this file) Sync architecture, algorithm, open questions, implementation order |
| `src/app/realGreen/callLog/callLogPlan.md` | Overall callLog module plan, type architecture, Customer integration, open questions |
| `src/app/realGreen/callLog/CallLogTypes.ts` | Raw → Core → Doc → CallLog type pipeline; `remapCallLogs` function |
| `src/app/realGreen/callLog/_lib/CallLogSearch.ts` | `CallLogSearchRaw` and `CallLogSearchCriteria` types |
| `src/app/realGreen/callLog/_lib/remapCallLogSearch.ts` | The search remap function (RealGreen boundary) |
| `src/app/realGreen/callLog/models/CallLogModel.ts` | Mongoose model — the upsert target for sync |
| `src/app/realGreen/callLog/callLogReason/CallLogReasonTypes.ts` | Reason metadata type pipeline |

### Architecture Context (Outside This Module)
| File | Purpose |
|---|---|
| `src/app/realGreen/realGreen.readme.md` | The RealGreen type boundary rule and 4-stage pipeline — essential for understanding why types are structured the way they are |
| `src/app/realGreen/_lib/api/rgApi.ts` | Typed RealGreen API path registry — check before adding new paths; shows what's already registered |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch.ts` | Reference implementation of the `*SearchRaw` / `*SearchCriteria` / `remapSearch*` pattern |

---

## 1. Goal

Establish a sync mechanism that periodically fetches call log data from the RealGreen API and persists it to MongoDB, so that:

- API routes read from Mongo instead of calling RealGreen on every request
- Queries are no longer limited to RealGreen's search criteria — any Mongo query is possible
- The app remains functional if RealGreen is temporarily unavailable
- This serves as the **pilot sync operation** and framework for eventually syncing Customer/Program/Service data

---

## 2. Why Sync First (Before UI)

The `CallLogSearch` POST endpoint returns up to 500 records per page and may return tens of thousands of records for a full load. Calling this on every UI request is:

- **Slow** — RealGreen API latency × N pages
- **Fragile** — any RealGreen outage breaks the feature
- **Wasteful** — most data hasn't changed since the last fetch

The correct architecture is:
1. Sync runs on a schedule (or on-demand trigger), fetching from RealGreen and upserting to Mongo
2. UI routes read from Mongo — fast, reliable, queryable in any way

---

## 3. The Delta-Sync Key

The `CallLogSearch` POST body supports `updated` date range filtering:

```typescript
type CallLogSearchRaw = {
  updated?: RGStringRange;  // { minValue: ISO8601, maxValue: ISO8601 }
  // ...
};
```

This means we can query: "give me all call logs updated since `lastSyncedAt`."

**Delta-sync loop:**
1. Initial full load: fetch all records (paginate through all offsets), upsert to Mongo, record `lastSyncedAt`
2. Subsequent syncs: fetch with `updated.minValue = lastSyncedAt`, upsert only changed records, update `lastSyncedAt`

---

## 4. Pagination Strategy: Capped Exponential Batch Fetch

The `records` field caps at 500 per page. Rather than fetching pages sequentially (which is slow for large datasets) or firing unlimited concurrent requests (which may rate-limit RealGreen), we use a **capped exponential batch fetch** pattern.

### Algorithm

**Constants:**
- `PAGE_SIZE = 500`
- `MAX_CONCURRENT = 8` — maximum concurrent requests per round (configurable; 16 is also reasonable)

**State:**
- `offset` — running offset, advances after each round
- `batchCount` — starts at 1, doubles each round, capped at `MAX_CONCURRENT`

**Each round:**
1. Build `batchCount` requests with offsets `offset + (i × PAGE_SIZE)` for `i = 0..batchCount-1`
2. Fire all requests concurrently (`Promise.all`)
3. If **any** result has `< PAGE_SIZE` records → done (discard results from batches after the short one)
4. Upsert all valid results to Mongo
5. Advance `offset += batchCount × PAGE_SIZE`
6. `batchCount = Math.min(batchCount × 2, MAX_CONCURRENT)`
7. Repeat until done

### Example Traces

**Small dataset (1,750 records):**
| Round | Batches | Offsets | Results | Done? |
|---|---|---|---|---|
| 0 | 1 | 0 | 500 | No |
| 1 | 2 | 500, 1000 | 500, 500 | No |
| 2 | 4 | 1500, 2000, 2500, 3000 | 250, 0, 0, 0 | Yes |

Total: 7 requests, max 4 concurrent. The 3 empty requests in round 2 are harmless — filtered before upsert.

**Large dataset (100,000 records):**
- Rounds 0–3: 1+2+4+8 = 15 requests, offset reaches 7,500. `batchCount` caps at 8.
- Rounds 4–24: 8 concurrent/round × 21 rounds = 168 requests, covering offsets 7,500–99,500.
- Round 25: 8 batches, one returns < 500. Done.
- Total: ~183 requests, max 8 concurrent.

**Delta sync (50 changed records):**
- Round 0: 1 batch returns 50. Done immediately.
- Total: 1 request.

### Implementation Sketch

```typescript
const PAGE_SIZE = 500;
const MAX_CONCURRENT = 8;

async function fetchCallLogs(rawSearch: CallLogSearchRaw): Promise<CallLogRaw[]> {
  const allRaw: CallLogRaw[] = [];
  let offset = 0;
  let batchCount = 1;

  while (true) {
    const offsets = Array.from({ length: batchCount }, (_, i) => offset + i * PAGE_SIZE);

    const pages = await Promise.all(
      offsets.map((batchOffset) =>
        rgApi<CallLogRaw[]>({
          path: "/CallLog/CallLogSearch",
          method: "POST",
          body: { ...rawSearch, records: PAGE_SIZE, offset: batchOffset },
        })
      )
    );

    // Collect results up to (but not including) the first short page
    let done = false;
    for (const page of pages) {
      allRaw.push(...page);
      if (page.length < PAGE_SIZE) {
        done = true;
        break;
      }
    }

    if (done) break;

    offset += batchCount * PAGE_SIZE;
    batchCount = Math.min(batchCount * 2, MAX_CONCURRENT);
  }

  return allRaw;
}
```

### Why This Pattern

- **Self-calibrating** — no need to know total record count upfront
- **Fast for small datasets** — terminates in 1–3 rounds for typical delta syncs
- **Scales for large datasets** — reaches max concurrency quickly and sustains it
- **Safe for RealGreen** — concurrency is bounded; no risk of overwhelming the API
- **Works identically for initial and delta syncs** — the `updated` filter on `rawSearch` handles the delta case transparently

---

## 5. Upsert Strategy

Each call log is upserted by `callLogId` (natural key). The notes array is replaced wholesale — RealGreen is the source of truth for note content.

**Current implementation (individual upserts — acceptable for small batches):**
```typescript
await Promise.all(
  cores.map((core) =>
    CallLogModel.findOneAndUpdate(
      { callLogId: core.callLogId },
      { $set: core },
      { upsert: true, new: true, lean: true },
    )
  )
);
```

**Preferred implementation for bulk sync (bulkWrite — single Mongo command):**
```typescript
await CallLogModel.bulkWrite(
  cores.map((core) => ({
    updateOne: {
      filter: { callLogId: core.callLogId },
      update: { $set: core },
      upsert: true,
    },
  }))
);
```

The `bulkWrite` approach should be used for the sync layer. The `Promise.all` approach is only acceptable for small on-demand fetches (e.g., refreshing one customer's logs).

---

## 6. `lastSyncedAt` Tracking

We need a place to store when the last sync ran. Options:

1. **Mongo document** — a `SyncMetadata` collection with `{ entityType: "callLog", lastSyncedAt: string }`
2. **GlobalSettings** — add `callLogLastSyncedAt` to the existing global settings document
3. **Environment variable / config** — not suitable (doesn't persist across deploys)

**Recommendation:** A dedicated `SyncMetadata` collection. It's clean, extensible (same pattern for Customer/Program/Service sync), and doesn't pollute GlobalSettings.

---

## 7. Sync Trigger Options

| Option | Pros | Cons |
|---|---|---|
| **Cron job (external)** | Runs independently of user requests | Requires external scheduler (Vercel Cron, AWS EventBridge, etc.) |
| **On-demand API route** | Simple to implement, easy to test | Must be manually triggered or called from a UI button |
| **Background thread on startup** | No external dependency | Next.js serverless doesn't support long-running processes |

**Recommendation for pilot:** Start with an **on-demand API route** (`/realGreen/callLog/sync/api`). This lets us test the sync logic without infrastructure complexity. Once validated, wire it to a Vercel Cron job.

---

## 8. Sync API Route Design

```typescript
// CallLogSyncContract
interface CallLogSyncContract extends ApiContract {
  syncCallLogs: {
    params: {
      /** If true, ignores lastSyncedAt and fetches all records (full reload). */
      force?: boolean;
    };
    result: DataResponse<{ synced: number; lastSyncedAt: string }>;
  };
}

// Route handler (server-side only, admin role)
syncCallLogs: {
  roles: ["admin"],
  handler: async ({ force }) => {
    const lastSyncedAt = force ? null : await getLastSyncedAt("callLog");
    const criteria: CallLogSearchCriteria = lastSyncedAt
      ? { updated: { min: lastSyncedAt, max: new Date().toISOString() } }
      : {};
    const rawSearch = remapCallLogSearch(criteria);
    const rawLogs = await fetchCallLogs(rawSearch);  // paginated
    const cores = remapCallLogs(rawLogs);
    await bulkUpsertCallLogs(cores);
    const newLastSyncedAt = new Date().toISOString();
    await setLastSyncedAt("callLog", newLastSyncedAt);
    return { success: true, payload: { synced: cores.length, lastSyncedAt: newLastSyncedAt } };
  },
},
```

---

## 9. Files to Create (Sync Layer)

```
src/app/realGreen/callLog/
  sync/
    CallLogSyncContract.ts
    route.ts
    callLogSyncFunc.ts    ← fetchCallLogs (paginated), bulkUpsertCallLogs
  models/
    CallLogModel.ts       ← (exists) full Mongoose model
    SyncMetadataModel.ts  ← (new) tracks lastSyncedAt per entity type
```

---

## 10. Open Questions (Answer via Sandbox)

Before designing the sync in detail, the sandbox page (`src/app/sandbox/callLog/page.tsx`) should answer:

1. **What does the actual RealGreen response look like?** Validate `CallLogRaw` type shape.
2. **Is `reason` on notes a numeric string like `"42"` or something else?** Determines `reasonMap` key type.
3. **Are notes always present?** `CallLogRaw.notes` is typed as optional — does the API always include them?
4. **What are the actual `status` values on `CallLog`?** Closed enum or open string?
5. **What is the actual RealGreen endpoint for action reasons?** Likely `/ActionReason` — needs verification.
6. **What are the actual `contactOrAttempt` values on `CallLogReason`?** Expected `"C"` / `"A"` — confirm.
7. **Does `CallLogSearch` POST actually work as documented?** Test with a known `custId` and verify the response matches `CallLogRaw[]`.
8. **What is the realistic volume?** How many call logs exist for a typical customer? For all customers? This informs pagination strategy and sync duration estimates.

---

## 11. Relationship to Customer/Program/Service Sync

The same delta-sync pattern applies to the customer pipeline:
- `CustomerSearch`, `ProgramSearch`, `ServiceSearch` all support `updated` date range filtering
- The `SyncMetadata` model can track `lastSyncedAt` for each entity type
- The pagination loop is identical
- The `bulkWrite` upsert strategy is identical

Once the callLog sync is validated, the framework is proven and can be applied to the major version upgrade of the customer pipeline — where routes read from Mongo instead of always calling RealGreen.

---

## 12. Implementation Order (When Ready)

1. Create `SyncMetadataModel.ts` — tracks `lastSyncedAt` per entity type
2. Create `callLogSyncFunc.ts` — `fetchCallLogs` (paginated), `bulkUpsertCallLogs`
3. Create `CallLogSyncContract.ts` — sync API contract
4. Create `sync/route.ts` — sync API route handler
5. Test via sandbox or direct API call
6. Wire to Vercel Cron (or equivalent) for automated scheduling
