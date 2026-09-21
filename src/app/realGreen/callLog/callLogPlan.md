
# CallLog Module Plan

## 1. Goals

1. **Fetch call log data from the RealGreen API** using a flexible, query-driven approach that mirrors the `CallLogSearch` POST endpoint.
2. **Normalize and type the data** through the standard 4-stage pipeline (Raw → Core → Doc → hydrated entity).
3. **Resolve `CallLogReason` metadata** — a separate sub-module that provides a lookup table for the `reason` field on each note.
4. **Store call logs in MongoDB** with embedded notes, enabling a future sync architecture where Mongo becomes the source of truth.
5. **Lay the groundwork for delta-sync** — the RealGreen search API supports `created` and `updated` date range filters, which is the key to incremental sync.
6. **Write-back to RealGreen** — flagged as a future concern; not designed in this phase.

---

## 2. Module Overview

```
src/app/realGreen/callLog/
  CallLogTypes.ts              ← (exists) Raw → Core → Doc → CallLog type pipeline
  callLogPlan.md               ← (this file)
  _lib/
    baseCallLog.ts             ← (exists) base/fallback objects
    callLogServerFunc.ts       ← remap + extend functions (server-side)
    CallLogSearch.ts           ← CallLogSearchRaw + CallLogSearchCriteria types
    remapCallLogSearch.ts      ← maps our criteria type → RealGreen raw search type
  api/
    CallLogContract.ts         ← TypeScript API contract
    route.ts                   ← Next.js API route using createRpcHandler
  models/
    CallLogDocPropsModel.ts    ← Mongoose model for CallLogDocProps
  callLogSlice.ts              ← Redux slice + thunks
  callLogSelect.ts             ← Reselect selectors
  useCallLog.ts                ← React hook for dispatching thunks
  callLogReason/               ← Sub-module (see Section 6)
    CallLogReasonTypes.ts
    _lib/
      baseCallLogReason.ts
      callLogReasonServerFunc.ts
    api/
      CallLogReasonContract.ts
      route.ts
    models/
      CallLogReasonDocPropsModel.ts
    callLogReasonSlice.ts
    callLogReasonSelect.ts
    useCallLogReason.ts
```

---

## 3. Type Architecture

### 3.1 CallLogReason (Metadata Lookup)

The `reason` field on `CallLogNoteRaw` is a string ID referencing a RealGreen metadata object. The full shape from the RealGreen API is:

```typescript
type CallLogReasonRaw = {
  actionReasonID: number;
  actionReason: string;
  status: string;
  contactOrAttempt: string;  // "C" = Contact, "A" = Attempt (likely)
  handheld: boolean;
  actionReasonFrench: string;
  actionReasonSpanish: string;
  letterID: number;
  sendNote: boolean;
  blockLead: boolean;
};
```

**Key fields for our use:**
- `actionReasonID` → natural key (`reasonId`)
- `actionReason` → display label (`reason`)
- `status` → may drive UI behavior (e.g., auto-set call log status on note creation)
- `contactOrAttempt` → distinguishes whether the note represents a successful contact or an attempt
- `sendNote` / `blockLead` → behavioral flags

**Type pipeline:**
```
CallLogReasonRaw → CallLogReasonCore → CallLogReasonDoc → CallLogReason
```

`CallLogReasonDocProps` will hold native metadata (e.g., `createdAt`, `updatedAt`, `reasonId`). Since this is a relatively static lookup table, DocProps may be minimal initially — but the full module structure is warranted because `status` and `contactOrAttempt` are likely to drive UI logic.

### 3.2 CallLogNote (Embedded)

Notes are embedded within their parent `CallLogDoc`. They are not stored in a separate collection.

**Rationale:**
- RealGreen delivers notes pre-joined with their parent log — no separate API call needed
- The primary access pattern is always "call logs for a customer, with their notes" — notes have no independent identity in the UI
- Upsert strategy: on sync, replace the entire `notes` array (RealGreen is the source of truth for note content)
- `callLogNoteId` is preserved on each note, enabling a future migration to a separate collection if cross-log note querying becomes a requirement

**Type pipeline:**
```
CallLogNoteRaw → CallLogNoteCore → (embedded in CallLogDoc) → CallLogNote (hydrated)
```

`CallLogNote` (the hydrated type) will resolve `reason: string` (the ID) → `reason: CallLogReason` (the full object).

### 3.3 CallLog (Parent)

**Type pipeline:**
```
CallLogRaw → CallLogCore → CallLogDoc → CallLog
```

`CallLogDocProps` stores native metadata: `callLogId`, `createdAt`, `updatedAt`. The `notes` array is embedded directly in the document.

`CallLog` (hydrated) will have `notes: CallLogNote[]` where each note's `reason` is resolved to a full `CallLogReason` object.

**Current `CallLogTypes.ts` assessment:**
The existing types are well-structured. The main gap is that `CallLogProps` is empty — it will be populated once we define what hydration means (resolving `CallLogReason` on notes). The `remapCallLogs` and `extendCallLogs` functions are already stubbed correctly.

---

## 4. Search / Fetch Strategy

### 4.1 The Two RealGreen Endpoints

**Endpoint A: `/CallLog/Customer/{custId}` (GET)**
- Already registered in `rgApi` as `{ path: \`/CallLog/Customer/${string}\`; method: "GET" }`
- Returns all call logs for a single customer, with notes embedded
- Simple, no pagination
- Use case: on-demand fetch for a single customer detail view

**Endpoint B: `/CallLog/CallLogSearch` (POST)**
- Not yet registered in `rgApi`
- Paginated: `records` (max 500) + `offset` fields
- Supports rich filtering: `customerID[]`, `enterDate`, `dueDate`, `status[]`, `enteredBy[]`, `assignedTo[]`, `created`, `updated`
- The `created` and `updated` date range fields are the **delta-sync keys**
- Use case: bulk fetch, sync operations, cross-customer queries

### 4.2 Search Type Remapping

Following the pattern established by `CustSearch.ts` / `remapCustSearch.ts`, we define two types:

**`CallLogSearchRaw`** — mirrors the RealGreen API body exactly:
```typescript
type CallLogSearchRaw = {
  customerID?: number[];
  enterDate?: RGStringRange;   // ISO 8601 date strings
  dueDate?: RGStringRange;
  phone?: string;
  status?: string[];
  enteredBy?: string[];
  assignedTo?: string[];
  created?: RGStringRange;
  updated?: RGStringRange;
  records?: number;            // max 500
  offset?: number;
};
```

**`CallLogSearchCriteria`** — our preferred naming and types:
```typescript
type CallLogSearchCriteria = {
  custIds?: number[];
  enterDate?: TRange<string>;
  dueDate?: TRange<string>;
  phone?: string;
  statuses?: string[];
  enteredBy?: string[];
  assignedTo?: string[];
  created?: TRange<string>;
  updated?: TRange<string>;
  records?: number;
  offset?: number;
};
```

**`remapCallLogSearch(criteria: CallLogSearchCriteria): CallLogSearchRaw`** — maps our type to the RealGreen type. This is the primary artifact of the current development phase.

### 4.3 Pagination

The `records` field caps at 500. For queries that may return more than 500 records (e.g., a full sync), the caller must implement pagination by incrementing `offset` until fewer than `records` results are returned. This is analogous to the `createPaginationStep` pattern in the customer module.

**Open Question:** Should the API route handle pagination internally (loop until done, return all results) or should the client drive pagination? For the initial implementation, the route should handle it internally — the client passes criteria and gets back all matching logs. This keeps the contract simple.

---

## 5. Storage Strategy

### 5.1 MongoDB Document Shape

`CallLogDoc` is stored as a single Mongo document per call log, with notes embedded:

```typescript
// Stored in MongoDB
type CallLogDoc = {
  callLogId: number;       // natural key, unique index
  custId: number;
  enterDate: string;
  dueDate: string;
  resolved: boolean;
  viewed: boolean;
  alarmSet: boolean;
  status: string;
  enteredBy: string;
  assignedTo: string;
  notes: CallLogNoteCore[];  // embedded array
  createdAt: string;         // from { timestamps: true }
  updatedAt: string;
};
```

### 5.2 Mongoose Model

`CallLogDocPropsModel` stores the native metadata fields. The `notes` array is part of the schema as an embedded subdocument array.

**Schema design:**
```typescript
const CallLogNoteSchema = new mongoose.Schema<CallLogNoteCore>({
  callLogNoteId: { type: Number, required: true },
  callLogId: { type: Number, required: true },
  date: { type: String, default: "" },
  reason: { type: String, default: "" },  // stores the reasonId string
  note: { type: String, default: "" },
  employeeId: { type: String, default: "" },
}, { _id: false });  // no _id on subdocuments

const CallLogDocPropsSchema = new mongoose.Schema<CallLogDoc>({
  callLogId: { type: Number, required: true, unique: true },
  custId: { type: Number, required: true },
  enterDate: { type: String, required: true },
  dueDate: { type: String, default: "" },
  resolved: { type: Boolean, default: false },
  viewed: { type: Boolean, default: false },
  alarmSet: { type: Boolean, default: false },
  status: { type: String, default: "" },
  enteredBy: { type: String, default: "" },
  assignedTo: { type: String, default: "" },
  notes: { type: [CallLogNoteSchema], default: [] },
}, { timestamps: true });
```

**Note:** Unlike `callAhead` and `conditionCode` where only `DocProps` is stored (and merged with a `Core` fetched live from RealGreen), `CallLog` stores the **full document** in Mongo. This is because call logs are not a static lookup table — they change over time and we want to sync them.

### 5.3 Upsert Strategy

On each fetch/sync, upsert by `callLogId`:
```typescript
await CallLogModel.findOneAndUpdate(
  { callLogId: doc.callLogId },
  { $set: doc },
  { upsert: true, new: true }
);
```

The entire `notes` array is replaced on each upsert. Since RealGreen is the source of truth for note content, this is correct — we are syncing, not merging.

---

## 6. CallLogReason Sub-Module

Lives at `src/app/realGreen/callLog/callLogReason/`.

**RealGreen API endpoint:** To be confirmed — likely `/ActionReason` or similar. Needs exploration.

**Fetch strategy:** Fetch once, cache with `staleTime` (same pattern as `callAhead`, `conditionCode`). This is a static-ish lookup table.

**Full module structure:**
- `CallLogReasonTypes.ts` — Raw → Core → DocProps → Doc → Props → CallLogReason
- `baseCallLogReason.ts` — fallback objects
- `callLogReasonServerFunc.ts` — remap + extend
- `CallLogReasonDocPropsModel.ts` — Mongoose model (minimal DocProps initially)
- `CallLogReasonContract.ts` — API contract (`getAll`)
- `route.ts` — API route
- `callLogReasonSlice.ts` — Redux slice
- `callLogReasonSelect.ts` — selectors including a `reasonMap: Map<string, CallLogReason>`
- `useCallLogReason.ts` — hook

**Hydration role:** The `callLogReasonSelect.reasonMap` is consumed by `callLogSelect` to resolve `note.reason` (string ID) → `note.reason` (full `CallLogReason` object) on the hydrated `CallLogNote` type.

---

## 7. Redux Architecture

### 7.1 Slice State

```typescript
type CallLogState = {
  callLogDocs: CallLogDoc[];
};
```

### 7.2 Thunks

- `getCallLogs({ params: { criteria: CallLogSearchCriteria } })` — fetches via `CallLogSearch` POST, stores results
- `getCallLogsForCustomer({ params: { custId: number } })` — fetches via `/CallLog/Customer/{id}` GET, stores results

### 7.3 Selectors

```typescript
const selectCallLogDocs = (state: AppState) => state.callLog.callLogDocs;

// Map by custId for efficient lookup
const selectCallLogsByCustId = createSelector(
  [selectCallLogDocs],
  (docs) => new Grouper(docs).toGroupMap(d => d.custId)
);

// Hydrated: resolve reason on each note
const selectCallLogs = createSelector(
  [selectCallLogDocs, callLogReasonSelect.reasonMap],
  (docs, reasonMap) => docs.map(doc => hydrateCallLog(doc, reasonMap))
);

const selectCallLogMap = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).toUniqueMap(l => l.callLogId)
);

const selectCallLogsByCustIdHydrated = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).toGroupMap(l => l.custId)
);
```

### 7.4 Hydrated Types

```typescript
// Hydrated note — reason resolved to full object
type CallLogNoteProps = {
  callLogReason: CallLogReason | null;
  // Future: enteredByEmployee: Employee | null;
};
type CallLogNote = CallLogNoteCore & CallLogNoteProps;

// Hydrated log — notes array uses hydrated note type
type CallLogProps = {
  notes: CallLogNote[];  // shadows CallLogDoc.notes with hydrated version
  // Future: enteredByEmployee: Employee | null;
  // Future: assignedToEmployee: Employee | null;
};
type CallLog = CallLogDoc & CallLogProps;
```

**Note:** `CallLogProps.notes` shadows `CallLogDoc.notes` with the hydrated version. This is intentional — the Doc stores raw note cores (with `reason` as a string ID), the hydrated entity exposes fully resolved notes.

Employee hydration onto `CallLog` (i.e., resolving `enteredBy` / `assignedTo` string IDs to full `Employee` objects) is **deferred**. The string IDs remain on the Doc and are available for lookup via `employeeSelect.employeeMap` in any component that needs them. When a concrete UI need arises, `enteredByEmployee` and `assignedToEmployee` can be added to `CallLogProps` following the same pattern as `Service.lastAssigned`.

For employee-centric views (e.g., "all logs assigned to this employee"), provide selector maps in `callLogSelect`:

```typescript
// Available without any type changes to Employee:
const selectCallLogsByEnteredBy = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).groupBy(l => l.enteredBy).toMap()
);
const selectCallLogsByAssignedTo = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).groupBy(l => l.assignedTo).toMap()
);
```

---

## 8. Customer Integration

### 8.1 `CustomerProps` Update

`callLogs: CallLog[]` is added to `CustomerProps` in `CustomerTypes.ts`:

```typescript
export type CustomerProps = {
  x: CustomerUtils;
  aging: Aging;
  programs: Program[];
  callLogs: CallLog[];      // ← added
  taxCodes: TaxCode[];
  taxRate: number;
  callAhead: CallAhead | null;
  discount: DiscountDoc | null;
  flags: Flag[];
  promise: SchedPromise | null;
  promiseIssues: string[];
};
```

### 8.2 `makeCustomersSelector` Update

`callLogSelect.callLogsByCustId` is added as a selector input to `makeCustomersSelector` in `centralSelectors.ts`. The hydration follows the same pattern as `flags`:

```typescript
// New input:
callLogSelect.callLogsByCustId,  // Map<number, CallLog[]>

// Inside customerBuilder:
const customerBuilder: CustomerBuilder = {
  ...custDoc,
  programs: [],
  callLogs: callLogsByCustId.get(custDoc.custId) ?? [],
  // ... rest of existing props
};
```

### 8.3 Load Order Behavior

If call logs are not yet loaded (empty state), `customer.callLogs` will be `[]`. When call logs load later, `makeCustomersSelector` re-runs and customers receive their logs. This is the same lazy-hydration behavior as `flags` and `priorityService` — no special handling required. The consuming hook (`useCallLog`) is responsible for triggering the fetch.

---

## 9. API Contract

The contract is intentionally minimal — a single pass-through operation for UI use:

```typescript
interface CallLogContract extends ApiContract {
  getCallLogsForCustomer: {
    params: { custId: number };
    result: DataResponse<CallLogCore[]>;
  };
}
```

The route handler:
1. Calls `rgApi` GET `/CallLog/Customer/{custId}`
2. Remaps raw results via `remapCallLogs` → `CallLogCore[]`
3. Returns the cores directly — **no Mongo writes**

**Why `CallLogCore[]` and not `CallLogDoc[]`?**
This route is a pass-through from RealGreen. There is no Mongo persistence, so there are no `createdAt`/`updatedAt` timestamps. Returning `CallLogCore[]` is honest about what the data is.

**`getCallLogs` (search-based) is deferred to the sync layer.** See `callLogSyncPlan.md`. The `CallLogSearch` POST endpoint, pagination loop, and bulk upsert belong in a dedicated sync route — not in the UI-facing contract.

---

## 10. `rgApi` Registration

The `CallLogSearch` POST endpoint needs to be added to `RgApiPath` in `rgApi.ts`:

```typescript
| {
    path: "/CallLog/CallLogSearch";
    method: "POST";
    body: CallLogSearchRaw;
  }
```

The `/CallLog/Customer/${string}` GET path is already registered.

---

## 11. Root Reducer Registration

`callLogReducer` and `callLogReasonReducer` must be added to `src/store/reducers/index.ts`.

---

## 12. Sync Architecture (Future)

> This section sketches the future direction. No implementation is planned in this phase.

### The Delta-Sync Pattern

The `CallLogSearch` endpoint supports `updated.minValue` / `updated.maxValue` date range filters. This enables incremental sync:

1. **Initial full load:** Fetch all call logs (paginate through all offsets), store in Mongo
2. **Periodic delta sync:** Query with `updated.minValue = lastSyncedAt`, fetch only changed records, upsert into Mongo
3. **API routes read from Mongo:** Instead of calling RealGreen on every request, routes query Mongo directly. RealGreen is only called during sync operations.

### Benefits

- **Speed:** Mongo queries are orders of magnitude faster than RealGreen API calls
- **Flexibility:** Any Mongo query is possible — no longer limited to RealGreen's search criteria
- **Offline resilience:** App continues to function if RealGreen API is temporarily unavailable
- **Framework for Customer/Program/Service:** The same delta-sync pattern applies to the customer module. If we prove it here with call logs (a simpler, lower-stakes entity), we have a validated framework for the major version upgrade of the customer pipeline.

### Key Design Invariants for Sync

- `callLogId` is the natural key — always use it as the upsert key
- `updatedAt` on the Mongo document reflects when **we** last synced it, not when RealGreen last updated it
- The RealGreen `updated` field in the search criteria refers to when RealGreen last updated the record — this is what drives delta queries
- Notes are always replaced wholesale on sync — no note-level diffing

---

## 13. Write-Back (Future)

> Not designed in this phase. Flagged for future exploration.

The RealGreen API likely supports POST/PUT to create or update call logs and notes. This would enable storing data from this app in the RealGreen CRM — a potentially powerful integration point. Key questions to explore:

- What is the POST body shape for creating a new call log?
- Can individual notes be added to an existing log, or must the entire log be replaced?
- What validation does RealGreen enforce (required fields, valid reason IDs, etc.)?
- What are the permission requirements?

---

## 14. Open Questions

1. **`CallLogReason` API endpoint:** What is the actual RealGreen path? Likely `/ActionReason` — needs verification against the RealGreen API docs or Swagger.

2. **`reason` field type on `CallLogNoteRaw`:** Currently typed as `string` in `CallLogTypes.ts`. Is this a numeric ID serialized as a string, or a string key? This affects how we key the `reasonMap`.

3. **Pagination limit:** Is 500 the hard cap on `records`, or can it be higher? The search body mockup shows `records: 500` as an example value. Needs testing.

4. **`status` values on `CallLog`:** What are the valid status strings? Are they a closed enum (like `CustStat`) or open-ended? This affects whether we define a `CallLogStatus` type.

5. **`contactOrAttempt` on `CallLogReason`:** What are the valid values? Likely `"C"` and `"A"` — needs confirmation. This field may drive important UI distinctions (e.g., color-coding notes).

6. **Notes on the `/CallLog/Customer/{id}` endpoint:** Does this endpoint always return notes embedded? Or is there a separate notes endpoint? The existing `CallLogRaw` type includes `notes?: CallLogNoteRaw[]` (optional), suggesting notes may not always be present.

7. **`CallLogSearch` vs. `/CallLog/Customer/{id}` for single-customer fetch:** For the common case of "load call logs for one customer," which endpoint is more appropriate? The GET endpoint is simpler; the POST search with `customerID: [custId]` is more consistent with the sync pattern.

8. **Employee hydration on `CallLog`:** Deferred. When a concrete UI need arises (e.g., a call log detail view that shows employee names inline), add `enteredByEmployee: Employee | null` and `assignedToEmployee: Employee | null` to `CallLogProps` and wire them through `makeCustomersSelector` or a standalone `callLogSelect` selector.

---

## 15. Proposed File Creation Order

For the current development phase:

1. `callLogReason/CallLogReasonTypes.ts` — define the type pipeline
2. `callLogReason/_lib/baseCallLogReason.ts` — base objects
3. `callLogReason/_lib/callLogReasonServerFunc.ts` — remap + extend
4. `callLogReason/models/CallLogReasonDocPropsModel.ts` — Mongoose model
5. `callLogReason/api/CallLogReasonContract.ts` — API contract
6. `callLogReason/api/route.ts` — API route
7. `callLogReason/callLogReasonSlice.ts` — Redux slice
8. `callLogReason/callLogReasonSelect.ts` — selectors
9. `callLogReason/useCallLogReason.ts` — hook
10. `_lib/CallLogSearch.ts` — search type definitions
11. `_lib/remapCallLogSearch.ts` — search remap function
12. `_lib/callLogServerFunc.ts` — remap + extend (update existing stubs)
13. `models/CallLogModel.ts` — full Mongoose model (not just DocProps)
14. `api/CallLogContract.ts` — API contract
15. `api/route.ts` — API route
16. `callLogSlice.ts` — Redux slice
17. `callLogSelect.ts` — selectors
18. `useCallLog.ts` — hook
19. Update `rgApi.ts` — register `CallLogSearch` POST path
20. Update `src/store/reducers/index.ts` — register both reducers
21. Update `CustomerTypes.ts` — add `callLogs: CallLog[]` to `CustomerProps`
22. Update `centralSelectors.ts` — add `callLogSelect.callLogsByCustId` input to `makeCustomersSelector` and wire `callLogs` into `customerBuilder`

