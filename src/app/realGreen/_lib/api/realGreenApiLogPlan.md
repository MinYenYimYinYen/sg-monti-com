# RealGreen API Call Logging — Architecture Reference

> **Status: Implemented.** This document describes the as-built system. It was originally written as a plan; all sections now reflect the implemented state.

---

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

### 3.1 Request-Scoped Call Accumulator via AsyncLocalStorage

`rgHttp` accumulates call counts into a `Map<string, number>` that is scoped to the current operation using Node.js `AsyncLocalStorage`. This is the key mechanism that makes logging accurate and isolated.

```typescript
// rgHttp.ts
import { AsyncLocalStorage } from "async_hooks";

export const rgCallMapStorage = new AsyncLocalStorage<Map<string, number>>();

// Inside rgHttp(), before the fetch:
const callMap = rgCallMapStorage.getStore();
if (callMap) {
  const key = pathTemplate ?? endpoint;
  callMap.set(key, (callMap.get(key) ?? 0) + 1);
}
```

**Why AsyncLocalStorage?**

The naive approach is a module-level variable (`let _callMap = {}`). This works correctly on Vercel serverless because each request gets its own isolated Node.js module instance. However, in Next.js dev mode, the server runs as a single persistent Node.js process — all concurrent requests share the same module instance and therefore the same `_callMap`. This causes "bleed": if `getServiceConditions` fires while `runSearchScheme:printedCustomers` is streaming, the service condition call gets counted inside the printedCustomers log.

`AsyncLocalStorage` solves this by creating a **context that flows through async call chains**. Think of it like a thread-local variable in traditional multi-threaded languages, but for async JavaScript. When you call `rgCallMapStorage.run(callMap, callback)`, it sets `callMap` as the "current store" for everything that runs inside that callback — including `await` calls, functions those functions call, generators, etc. When the callback finishes, the context is gone.

Key properties:
- **Isolated per operation**: Two concurrent `run()` calls each have their own private `Map`. They cannot see or modify each other's data.
- **Flows automatically**: You don't pass the map as a parameter through every function. Any code that calls `rgCallMapStorage.getStore()` inside the `run()` context gets the right map automatically.
- **Temporary**: The `Map` object exists only for the duration of the `run()` callback. Once the operation completes, it's garbage collected.
- **Server-side only**: This is a Node.js API (`async_hooks` module). It has nothing to do with browser `localStorage`.
- **Opt-in**: If `rgHttp` is called outside a `run()` context (e.g., from `auth/api/route.ts` which uses plain `createRpcHandler`), `getStore()` returns `undefined` and accumulation is silently skipped. No errors, no side effects.

The `rgCallMapStorage` instance itself is module-level and permanent — but it's just a container. The data inside it is always operation-scoped.

### 3.2 Automatic Logging via `createRealGreenRpcHandler`

All RealGreen `route.ts` files use `createRealGreenRpcHandler` instead of the generic `createRpcHandler`. This wrapper automatically brackets every handler with a fresh call map context:

```typescript
// _lib/api/createRealGreenRpcHandler.ts
handler: async (params) => {
  const callMap = new Map<string, number>();
  const startMs = Date.now();

  const result = await rgCallMapStorage.run(callMap, () => handler(params));

  await logRgApiOperation({
    operation: op,
    callsByEndpoint: Object.fromEntries(callMap),
    durationMs: Date.now() - startMs,
  });

  return result;
},
```

`logRgApiOperation` is awaited (not fire-and-forget) because RealGreen API latency dominates — the Mongo write is negligible by comparison. If the logging strategy ever changes (fire-and-forget, retry, etc.), there is one place to update.

### 3.3 The `totalCalls: 0` Case

Some operations that go through `createRealGreenRpcHandler` make no RealGreen API calls — for example, `getKeywords` in `callAhead/api/route.ts` reads only from MongoDB. These operations produce log documents with `totalCalls: 0`.

This is **accurate and intentional**. The log correctly records that the operation ran, made no RealGreen calls, and took N milliseconds (Mongo read time). This is useful for confirming which operations are free vs. expensive.

**Future consideration:** If Mongo call counting is ever added to the logging system (e.g., tracking MongoDB reads per operation), these zero-RealGreen-call logs would become noise mixed in with the RealGreen-specific data. At that point, a filter should be added to `createRealGreenRpcHandler`:

```typescript
// Only log if at least one RealGreen call was made
if (callMap.size > 0) {
  await logRgApiOperation({ ... });
}
```

Until then, the zero-call logs are harmless and informative.

### 3.4 Log Document Shape

```typescript
type RgApiLog = {
  timestamp: string;                       // ISO 8601 — when the operation ran
  operation: string;                       // e.g. "syncCallLogs", "getProgCodes"
  callsByEndpoint: Record<string, number>; // e.g. { "/CallLog/CallLogSearch": 7 }
  totalCalls: number;                      // sum of all values in callsByEndpoint
  recordCount?: number;                    // optional — records fetched/processed
  durationMs?: number;                     // optional — wall clock time
};
```

**Example: callLog delta sync**
```json
{
  "timestamp": "2026-09-23T15:30:00.000Z",
  "operation": "syncCallLogs",
  "callsByEndpoint": { "/CallLog/CallLogSearch": 1 },
  "totalCalls": 1,
  "durationMs": 312
}
```

**Example: program/service load**
```json
{
  "timestamp": "2026-09-23T08:00:00.000Z",
  "operation": "getProgCodes",
  "callsByEndpoint": {
    "/ProgramCode": 1,
    "/ProgramCode/{id}/Services": 42
  },
  "totalCalls": 43,
  "durationMs": 8200
}
```

**Example: internal-only operation (no RealGreen calls)**
```json
{
  "timestamp": "2026-09-24T00:11:57.750Z",
  "operation": "getKeywords",
  "callsByEndpoint": {},
  "totalCalls": 0,
  "durationMs": 38
}
```

### 3.5 MongoDB Collection

The `rgApiLog` collection uses a **TTL index** to auto-delete documents older than **365 days**. This retains a full year of history for off-season analysis (the business is seasonal).

```typescript
RgApiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
```

Note: The TTL index is on `createdAt` (a real Date field managed by Mongoose), not on the `timestamp` string field.

---

## 4. `RgApiPath` and `pathTemplate`

### 4.1 The Problem

Dynamic paths like `` `/Customer/${string}` `` resolve to `/Customer/12345` at runtime — `rgHttp` cannot reliably infer the template from the resolved string alone.

### 4.2 The Solution: Required `pathTemplate` on Every Union Member

Each member of `RgApiPath` has a **required** `pathTemplate` field — the canonical, human-readable key used for log grouping:

```typescript
// Static path — template equals path
| { path: "/CallLog/CallLogSearch"; method: "POST"; body: CallLogSearchRaw; pathTemplate: "/CallLog/CallLogSearch" }

// Dynamic path — template uses {placeholder} names
| { path: `/Customer/${string}`; method: "GET"; body?: undefined; pathTemplate: "/Customer/{custId}" }
```

`pathTemplate` being required (not optional) is intentional: it enforces clean log keys at compile time and prevents raw dynamic paths from slipping into the log.

### 4.3 `rgApi` Forwards `pathTemplate` to `rgHttp`

```typescript
export async function rgApi<T>(config: RgApiPath) {
  const { path, method, body, pathTemplate } = config;
  return rgHttp<T>(path, { method, body: body as any }, pathTemplate);
}
```

### 4.4 `rgSearch` Derives Its Own Template

`rgSearch` constructs the path internally from `criteria.searchType` and passes a matching template:

```typescript
// e.g. "/Customer/Search", "/Program/Search", "/Service/Search"
const pathTemplate = `/${capitalize(criteria.searchType)}/Search`;
return rgHttp<T>(path, { method: "POST", body }, pathTemplate);
```

---

## 5. Files

### Created

```
src/app/realGreen/rgApiLog/
  RgApiLogTypes.ts              ← RgApiLog type
  RgApiLogModel.ts              ← Mongoose model with 365-day TTL index
  rgApiLogFunc.ts               ← logRgApiOperation() helper

src/app/realGreen/_lib/api/
  createRealGreenRpcHandler.ts  ← Wraps createRpcHandler with AsyncLocalStorage logging bracket
```

### Modified

| File | Change |
|---|---|
| `_lib/api/rgHttp.ts` | Replaced module-level `_callMap` with `AsyncLocalStorage`; accumulates into current context store if active |
| `_lib/api/rgApi.ts` | Added required `pathTemplate` to every `RgApiPath` union member; forwarded to `rgHttp` |
| `_lib/api/rgSearchApi.ts` | Derives and passes `pathTemplate` to `rgHttp` |
| All 16 RealGreen `route.ts` files | `createRpcHandler` → `createRealGreenRpcHandler` |
| `customer/api/route.ts` | Manual logging via `rgCallMapStorage.run()` — cannot use `createRealGreenRpcHandler` because `runSearchScheme` returns a `ReadableStream` before the RealGreen calls execute. The logging bracket lives inside the stream's `start()` callback. |

### Why `customer/api/route.ts` Is Different

`createRealGreenRpcHandler` assumes the handler is fully done when it returns. For `runSearchScheme`, the handler returns a `ReadableStream` immediately — the actual RealGreen calls happen asynchronously inside the stream's `start()` callback, which runs after the handler has already returned. Wrapping the handler return with `rgCallMapStorage.run()` would log an empty map (the stream hasn't executed yet).

The solution is to place `rgCallMapStorage.run(callMap, async () => { ... })` directly inside `start()`, wrapping the entire stream execution body. This is a one-off manual pattern, not a general concern — it only applies to streaming routes.

---

## 6. Future: Admin UI

A future admin page at `/realGreen/rgApiLog` could display:
- Total calls per day by endpoint
- Calls per operation over time
- Comparison: before sync vs. after sync

Not planned for the current phase. The data accumulates in Mongo once logging is wired up, ready for a UI when needed.
