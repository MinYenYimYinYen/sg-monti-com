# RealGreen API Call Logging Plan

## 1. Goal

Track how many RealGreen API calls are made per operation, broken down by endpoint, so we can:

- Understand actual API usage against the metered RealGreen plan
- Identify which operations are expensive (e.g., how many `/Service/Search` calls per day)
- Establish a baseline before sync is implemented, and measure the reduction after
- Inform decisions about sync frequency (e.g., 5-minute Vercel Cron vs. 1-minute)

---

## 2. The RealGreen HTTP Surface

All RealGreen API calls flow through one of two wrappers, both of which call `rgHttp`:

| Wrapper | File | Used By |
|---|---|---|
| `rgApi` | `_lib/api/rgApi.ts` | All typed endpoints — callLog, callAhead, employee, flag, priceTable, etc. |
| `rgSearch` | `_lib/api/rgSearchApi.ts` | Customer/Program/Service search pipeline only |
| `rgHttp` | `_lib/api/rgHttp.ts` | The raw fetch wrapper — **both above call this** |

`rgHttp` is the single chokepoint. Instrumenting it catches every RealGreen API call regardless of which higher-level wrapper initiated it.

---

## 3. Architecture

### 3.1 In-Memory Accumulator in `rgHttp`

`rgHttp` maintains a module-level call map (endpoint → count). In Next.js serverless, module-level variables are scoped to a single function invocation, so the map naturally resets between requests — which is exactly what we want.

```typescript
// rgHttp.ts additions
let _callMap: Record<string, number> = {};

export function getRgHttpCallMap(): Record<string, number> {
  return { ..._callMap };
}

export function resetRgHttpCallMap(): void {
  _callMap = {};
}

// Inside rgHttp(), before the fetch:
const key = pathTemplate ?? endpoint;
_callMap[key] = (_callMap[key] ?? 0) + 1;
```

The `pathTemplate` parameter (see Section 4) is the canonical key. If not provided (e.g., from `rgSearch`), the raw endpoint string is used as fallback.

### 3.2 Opt-In Logging by Callers

Routes that want visibility reset the map at the start, do their work, then read the map and log once to Mongo:

```typescript
// Example: callLog sync route
resetRgHttpCallMap();
const startMs = Date.now();

const rawLogs = await fetchCallLogs(rawSearch);
const synced = await bulkUpsertCallLogs(rawLogs);

await logRgApiOperation({
  operation: "syncCallLogs",
  callsByEndpoint: getRgHttpCallMap(),
  recordCount: synced,
  durationMs: Date.now() - startMs,
});
```

Routes that don't opt in simply don't log — no forced concern leakage into business logic.

### 3.3 Log Document Shape

```typescript
type RgApiLog = {
  timestamp: string;                    // ISO 8601 — when the operation ran
  operation: string;                    // e.g. "syncCallLogs", "getProgServ"
  callsByEndpoint: Record<string, number>; // e.g. { "/CallLog/CallLogSearch": 7 }
  totalCalls: number;                   // sum of all values in callsByEndpoint
  recordCount?: number;                 // optional — records fetched/processed
  durationMs?: number;                  // optional — wall clock time
};
```

**Example: callLog delta sync (50 changed records)**
```json
{
  "timestamp": "2026-09-23T15:30:00.000Z",
  "operation": "syncCallLogs",
  "callsByEndpoint": { "/CallLog/CallLogSearch": 1 },
  "totalCalls": 1,
  "recordCount": 47,
  "durationMs": 312
}
```

**Example: full customer/program/service load**
```json
{
  "timestamp": "2026-09-23T08:00:00.000Z",
  "operation": "getProgServ",
  "callsByEndpoint": {
    "/Customer/Search": 12,
    "/Program/Search": 8,
    "/Service/Search": 30
  },
  "totalCalls": 50,
  "recordCount": 15000,
  "durationMs": 45200
}
```

### 3.4 MongoDB Collection

The `rgApiLog` collection uses a **TTL index** to auto-delete documents older than 30 days. This prevents unbounded growth while retaining enough history for trend analysis.

```typescript
RgApiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
```

---

## 4. `RgApiPath` Refactor

### 4.1 The Problem

The current `RgApiPath` type is a discriminated union of ad-hoc shapes. Each member has `path`, `method`, and optionally `body`, but there is no enforcement that every member provides a canonical path template for logging. Dynamic paths like `` `/Customer/${string}` `` resolve to `/Customer/12345` at runtime — `rgHttp` cannot reliably infer the template from the resolved string alone (some dynamic segments are strings, not just numbers).

### 4.2 The Solution: Add `pathTemplate` to Every Union Member

Each member of `RgApiPath` gains a required `pathTemplate` field — the canonical, human-readable key used for log grouping:

```typescript
// Before
| { path: `/Customer/${string}`; method: "GET"; body?: undefined }

// After
| { path: `/Customer/${string}`; method: "GET"; body?: undefined; pathTemplate: "/Customer/{custId}" }
```

Static paths use themselves as the template:
```typescript
// Before
| { path: "/CallLog/CallLogSearch"; method: "POST"; body: CallLogSearchRaw }

// After
| { path: "/CallLog/CallLogSearch"; method: "POST"; body: CallLogSearchRaw; pathTemplate: "/CallLog/CallLogSearch" }
```

### 4.3 `rgApi` Forwards `pathTemplate` to `rgHttp`

```typescript
export async function rgApi<T>(config: RgApiPath) {
  const { path, method, body, pathTemplate } = config;
  return rgHttp<T>(path, { method, body: body as any }, pathTemplate);
}
```

### 4.4 `rgSearch` Derives Its Own Template

`rgSearch` constructs the path internally from `criteria.searchType`. It passes a derived template:

```typescript
export async function rgSearch<T>(criteria: SearchCriteriaRaw) {
  // path and pathTemplate are both static for these endpoints
  const pathTemplate = `/${capitalize(criteria.searchType)}/Search`;
  // e.g. "/Customer/Search", "/Program/Search", "/Service/Search"
  return rgHttp<T>(path, { method: "POST", body }, pathTemplate);
}
```

### 4.5 Impact on Consumers

**Runtime behavior:** Zero change. Callers of `rgApi` still pass the same `path`, `method`, and `body`. They just add one new required field: `pathTemplate`.

**TypeScript:** Adding `pathTemplate` as a required field to each union member will cause compile errors at every `rgApi` call site that doesn't provide it. Running `tsc --noEmit` after the type change gives the complete list of locations to update. The fix at each site is mechanical — add `pathTemplate: "/The/Template/{placeholder}"`.

**Estimated scope:** ~25 union members in `RgApiPath`, each corresponding to one or more call sites in route files.

---

## 5. Files to Create

```
src/app/realGreen/rgApiLog/
  RgApiLogTypes.ts          ← RgApiLog type
  RgApiLogModel.ts          ← Mongoose model with TTL index (30 days)
  rgApiLogFunc.ts           ← logRgApiOperation() helper
```

---

## 6. Files to Modify

| File | Change |
|---|---|
| `_lib/api/rgHttp.ts` | Add `_callMap`, `getRgHttpCallMap()`, `resetRgHttpCallMap()`, accept optional `pathTemplate` param |
| `_lib/api/rgApi.ts` | Add `pathTemplate` to every `RgApiPath` union member; forward to `rgHttp` |
| `_lib/api/rgSearchApi.ts` | Derive and pass `pathTemplate` to `rgHttp` |
| `callLog/sync/route.ts` | Opt in: reset → sync → log |
| Other routes (future) | Opt in as needed |

---

## 7. Implementation Order

1. Create `rgApiLog/` module (types, model, log helper)
2. Modify `rgHttp.ts` — add accumulator + accept `pathTemplate`
3. Modify `RgApiPath` — add `pathTemplate` to all union members
4. Modify `rgApi.ts` — forward `pathTemplate`
5. Modify `rgSearchApi.ts` — derive and pass `pathTemplate`
6. Run `tsc --noEmit` — fix all call sites flagged by the compiler
7. Wire `callLog/sync/route.ts` to log after each sync run
8. Wire other high-value routes (getProgServ, getPriceTable, etc.) as needed

---

## 8. Deferred: Admin UI

A future admin page at `/realGreen/rgApiLog` could display:
- Total calls per day by endpoint
- Calls per operation over time
- Comparison: before sync vs. after sync

Not planned for the current phase. The data will be accumulating in Mongo once logging is wired up, ready for a UI when needed.
