# CallLog Implementation Checklist

This is a temporary working checklist tracking all outstanding implementation work across the callLog sync initiative and its related modules. Delete when all items are complete.

---

## Phase 1: Validate the Sync ✅ COMPLETE

- [x] **Test the sync endpoint manually**
  - POST `{ "op": "syncCallLogs", "force": true }` to `/realGreen/callLog/sync/api`
  - Confirmed call logs land in the `callLogs` MongoDB collection
  - Confirmed a `syncMetadata` document is created with `entityType: "callLog"` and a valid `lastSyncedAt`

- [x] **Test delta sync**
  - POST `{ "op": "syncCallLogs" }` (no `force`) to the same endpoint
  - Confirmed it only fetches records updated since `lastSyncedAt`
  - Confirmed `lastSyncedAt` is updated to the new timestamp

- [x] **Verify record count is reasonable**
  - Checked `db.callLogs.countDocuments()` in Mongo
  - Spot-checked documents for correct shape

---

## Phase 2: CallLog Status CRUD UI — CANCELLED

> **Discovery (2026-09-23):** The `callLogStatus` and `callLogReason` sub-modules were built on incorrect assumptions about the RealGreen API shape.
>
> - The `status` field on `CallLog` already arrives as a **human-readable description string** (e.g., `"Resolved"`, `"In Process"`, `"Z_OBS_New Call"`), not a single-character code. The `resolved` flag is also already a first-class boolean on the call log itself.
> - The `reason` field on `CallLogNote` also arrives as a **human-readable string** (e.g., `"Account Update - In Process"`), not a numeric ID requiring a lookup table.
>
> Both modules were disconnected from the app and their folders deleted. No status lookup table or reason lookup table is needed.

- [x] ~~Build CRUD UI for CallLog Status~~ — **N/A: module removed**
- [x] ~~Status Discovery workflow~~ — **N/A: status is already a string on the call log**

---

## Phase 3: RealGreen API Call Logging (After Phase 1)

See `src/app/realGreen/_lib/api/realGreenApiLogPlan.md` for full design.

- [x] **Create `rgApiLog` module**
  - `src/app/realGreen/rgApiLog/RgApiLogTypes.ts` — `RgApiLog` type
  - `src/app/realGreen/rgApiLog/RgApiLogModel.ts` — Mongoose model with 365-day TTL index
  - `src/app/realGreen/rgApiLog/rgApiLogFunc.ts` — `logRgApiOperation()` helper

- [x] **Instrument `rgHttp.ts`**
  - Add module-level `_callMap: Record<string, number>`
  - Export `getRgHttpCallMap()` and `resetRgHttpCallMap()`
  - Accept `pathTemplate` param; use as map key (fallback to raw endpoint)
  - Increment map on every call

- [x] **Refactor `RgApiPath` union in `rgApi.ts`**
  - Added required `pathTemplate` field to every union member
  - Static paths: `pathTemplate` = same as `path`
  - Dynamic paths: `pathTemplate` = template with `{placeholder}` names (e.g., `"/Customer/{custId}"`)
  - Updated `rgApi()` function to destructure and forward `pathTemplate` to `rgHttp`

- [x] **Update `rgSearchApi.ts`**
  - Derive `pathTemplate` from `criteria.searchType` (e.g., `"/Customer/Search"`)
  - Pass to `rgHttp`

- [x] **Fix all `rgApi` call sites**
  - Added `pathTemplate` to all call sites across route files (auth, callLog, callAhead, company, conditionCode, custFlag, discount, employee, flag, prepay, priceTable, product, progServ, serviceCondition, taxCode, zipCode)
  - Verified with `tsc --noEmit` — zero `pathTemplate` errors remain

- [x] **Create `createRealGreenRpcHandler.ts`** — wraps `createRpcHandler`, adds `resetRgHttpCallMap()` before each handler and `logRgApiOperation()` after (awaited). All 16 RealGreen `route.ts` files updated to use it.

---

## Phase 4: Vercel Cron (After Phase 1 Validated in Production)

See `src/app/realGreen/syncMetadata/realGreenSync.readme.md` Section 8.

- [ ] **Create `vercel.json`** with cron schedule (suggested: every 5 minutes)
  ```json
  {
    "crons": [{ "path": "/api/cron/syncCallLogs", "schedule": "*/5 * * * *" }]
  }
  ```

- [ ] **Create cron route** at `src/app/api/cron/syncCallLogs/route.ts`
  - Validate `CRON_SECRET` header
  - Call the same sync logic as the on-demand route
  - Return 200 on success

- [ ] **Set `CRON_SECRET` environment variable** in Vercel dashboard

---

## Phase 5: SyncMetadata Admin UI (Future — Low Priority)

- [ ] **Build admin sync status page** at `/realGreen/syncMetadata`
  - Table showing `entityType` + `lastSyncedAt` for each synced entity
  - "Sync Now" button per entity (calls the entity's sync route)
  - No Redux needed — local `useState` + `api()` call on mount

---

## Reference: Plan Documents

| Document | Location |
|---|---|
| CallLog overall plan | `callLogPlan.md` |
| CallLog sync design | `callLogSyncPlan.md` |
| RealGreen sync architecture | `src/app/realGreen/syncMetadata/realGreenSync.readme.md` |
| RealGreen API logging plan | `src/app/realGreen/_lib/api/realGreenApiLogPlan.md` |

## Reference: What's Built

| Module | Status |
|---|---|
| `CallLogModel` | ✅ Done |
| `CallLogSearch` types + remap | ✅ Done |
| `callLog/sync/` (fetch + upsert + route) | ✅ Done |
| `syncMetadata/` module (model, types, funcs, API) | ✅ Done |
| `SYNC_ENTITY_TYPES` registry | ✅ Done |
| `callLogStatus` module | ❌ Removed — status is already a string on the call log |
| `callLogReason` module | ❌ Removed — reason is already a string on the note |
