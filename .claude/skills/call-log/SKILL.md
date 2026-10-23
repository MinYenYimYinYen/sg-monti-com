---
name: call-log
description: Work on the RealGreen CallLog module - call log types, callLogSlice, callLogSelect, useCallLog, the CallLogModel, delta sync via mirrorSync (syncCallLogs, bulkUpsertCallLogs, findCallLogSyncEdge), single-customer live fetch, and CallLog integration into hydrated Customer. Use when touching src/app/realGreen/callLog, changing call log sync behavior, or surfacing call logs in customer UI.
---

# CallLog Module

Reference: `src/app/realGreen/callLog/callLog.readme.md` (about 140 lines; read it all, it is short).
Wider sync architecture: `src/app/vercelCron/expandedSyncPlan.md`, `src/app/vercelCron/mirrorSync/mirrorSync.readme.md`, `src/app/realGreen/syncMetadata/realGreenSync.readme.md`.

## Shape of the module

- Type pipeline: `CallLogRaw` -> `CallLogCore` -> `CallLogDoc` -> `CallLog`. Notes are **embedded** in the parent doc (`CallLogNoteRaw` -> `CallLogNoteCore`), not a separate collection. Natural key: `callLogId`.
- `status` (on the call log) and `reason` (on a note) already arrive as human-readable strings, and `resolved` is a boolean. **Do not build status or reason lookup tables**; the planned `callLogStatus` and `callLogReason` sub-modules were removed for this reason.
- Two RealGreen endpoints: `GET /CallLog/Customer/{custId}` (all logs for one customer, used by `api/route.ts` for on-demand fetches) and `POST /CallLog/CallLogSearch` (paginated, max 500 per page, supports the `updated` range filter, used by sync).
- UI reads call logs from MongoDB (mirror). There is **no client-side pipeline flag** and no RealGreen fallback for bulk queries, because `CallLogSearch` is too slow for UI use.
- Integration: `callLogs: CallLog[]` is on `CustomerProps`, wired through `makeCustomersSelector` via `callLogSelect.callLogsByCustId`.

## Sync rules

1. Delta sync fetches only records with `updated` since `lastSyncedAt`.
2. The sync edge is computed from the returned data: `max(notes[].date) - 5 min` comfort buffer (covers RealGreen indexing lag). If no notes have dates, fall back to `syncStart - 5 min`. There is no Reporting endpoint for call logs, so do not use the customer/program binary-search edge finder here.
3. Upserts are `bulkWrite` keyed by `callLogId`, and the whole `notes` array is replaced each time. RealGreen is the source of truth for notes. Re-upserting is idempotent; keep it that way.
4. `syncCallLogs()` runs concurrently with the customer, program and service syncs inside `runDeltaSync()` (`src/app/realGreen/customer/sync/runDeltaSync.ts`), triggered by the `mirrorSync` cron.
5. Switch points: remove `syncCallLogs()` from the `Promise.all` in `runDeltaSync.ts` to disable cron sync; POST `{ op: "syncCallLogs", force: true }` to `sync/api/route.ts` (admin only) to force a sync.

## Conventions that apply

- RealGreen type boundary: `CallLogSearchRaw` mirrors RealGreen (`RGStringRange`); `CallLogSearchCriteria` uses our `TRange<string>`; `remapCallLogSearch` is the only bridge (see the `realgreen-customer` skill).
- Routes use `createRealGreenRpcHandler` (see the `api-route` skill). Select with `useSelector(callLogSelect.<name>)`; `useCallLog` exposes actions only.
- Deferred, not designed: employee hydration (`enteredByEmployee`, `assignedToEmployee`) and write-back to RealGreen. Ask before building either.

## Verify

Run the IDE diagnostics on edited files, and `npx tsc --noEmit` if you changed `CallLogTypes.ts`. Do not start the dev server.
