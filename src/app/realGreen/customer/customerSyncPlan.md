# Customer Sync Plan

This document is the execution-oriented plan for syncing Customer, Program, and Service data from RealGreen into MongoDB, replacing the live-fetch pipeline with a sync-before-read architecture.

---

## Required Reading (For Future Agents)

Read **only** the files listed below before responding. They provide sufficient context to reason about this plan and execute any step. If the conversation reveals a need for additional context, ask the user to approve further reading.

### This Module
| File | Purpose |
|---|---|
| `src/app/realGreen/customer/customerSyncPlan.md` | (this file) Execution plan, prerequisites, implementation order |
| `src/app/realGreen/customer/customerSyncBrainstorm.md` | Architectural analysis and decisions made during planning |
| `src/app/realGreen/customer/_lib/entities/types/CustomerTypes.ts` | `CustomerRaw`, `CustomerCore`, `CustomerDoc`, `Customer` — includes pending Core fields |
| `src/app/realGreen/customer/_lib/entities/types/ProgramTypes.ts` | `ProgramRaw`, `ProgramCore`, `ProgramDoc`, `Program` — includes pending Core fields |
| `src/app/realGreen/customer/_lib/entities/types/ServiceTypes.ts` | `ServiceRaw`, `ServiceCore`, `ServiceDoc`, `Service` — includes pending Core fields |
| `src/app/realGreen/customer/_lib/entities/serverFuncs/CustomerFuncs.ts` | `remapCustomers`, `extendCustomers` (currently mocked) |
| `src/app/realGreen/customer/_lib/entities/serverFuncs/ProgramFuncs.ts` | `remapPrograms`, `extendPrograms` (currently mocked) |
| `src/app/realGreen/customer/_lib/entities/serverFuncs/serviceServerFunc.ts` | `remapServices`, `extendServices` (uses `ServiceDocPropsModel`) |

### Sync Architecture Reference
| File | Purpose |
|---|---|
| `src/app/realGreen/syncMetadata/realGreenSync.readme.md` | Full sync architecture: delta-sync key, pagination algorithm, upsert strategy |
| `src/app/realGreen/syncMetadata/syncEntityTypes.ts` | Registry of all synced entity types — add `customer`, `program`, `service` here |
| `src/app/realGreen/syncMetadata/syncMetadataFunc.ts` | `getLastSyncedAt` / `setLastSyncedAt` helpers |
| `src/app/realGreen/callLog/sync/callLogSyncFunc.ts` | **Reference implementation** — capped exponential batch fetch + bulkWrite upsert |
| `src/app/realGreen/callLog/sync/CallLogSyncContract.ts` | Reference contract shape |
| `src/app/realGreen/callLog/sync/api/route.ts` | Reference route handler |

### Search Criteria & Remap (for `updated` filter wiring)
| File | Purpose |
|---|---|
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/RGSearchBase.ts` | `updated` and `created` already on base — just needs uncommenting in Raw types |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch.ts` | `CustomerSearchRaw` — `updated` commented out |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ProgSearch.ts` | `ProgramSearchRaw` — `updated` commented out; `ProgramSearchCriteria` missing `updated` |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch.ts` | `ServiceSearchRaw` — `updated` commented out; `ServiceSearchCriteria` already has `updated` |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch.ts` | Needs `updated` passthrough |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch.ts` | Needs `updated` passthrough |
| `src/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch.ts` | Already passes `updated` through |

### Assignments Refactor Reference
| File | Purpose |
|---|---|
| `src/app/realGreen/customer/_lib/models/ServiceDocPropsModel.ts` | Current model — `assignments` embedded here, to be removed |
| `src/app/assignment/AssignmentTypes.ts` | `AssignmentDoc` type — the natural key is `servId` |
| `src/app/assignment/api/route.ts` | Queries `ServiceDocPropsModel` — must migrate to new `AssignmentModel` |
| `src/app/csv/api/route.ts` | Writes to `ServiceDocPropsModel.assignments` — must migrate to `AssignmentModel` |
| `src/app/realGreen/customer/selectors/hydrateLastAssigned.ts` | Reads `serviceDoc.assignments` — must read from `ServiceProps.assignments` after refactor |
| `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts` | `assignmentOutcome` reads `this.service.assignments` — still works after move to `ServiceProps` |

### Route Handler (Migration Seam)
| File | Purpose |
|---|---|
| `src/app/realGreen/customer/api/route.ts` | `runSearchScheme` handler — the seam where `dataSource` branching will be added |
| `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes.ts` | `SearchScheme` definitions — `dataSource` field to be added |
| `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme.ts` | `SearchScheme` type — add `dataSource: "live" | "synced"` |

### Sandbox UI Reference
| File | Purpose |
|---|---|
| `src/app/sandbox/syncTest/page.tsx` | Existing callLog sync UI — copy this pattern for customer/program/service sync |

---

## Status

| Step | Status |
|---|---|
| Core type field stubs added (pending name confirmation) | ✅ Done |
| Assignments refactor | ⬜ Not started |
| `updated` filter wiring | ⬜ Not started |
| Sync infrastructure (models, sync funcs, routes) | ⬜ Not started |
| Sandbox UI for triggering syncs | ⬜ Not started |
| `extendCustomers` / `extendPrograms` unmocked | ⬜ Not started |
| `dataSource` field + route handler branching | ⬜ Not started |
| Validation (compare Mongo vs. live pipeline) | ⬜ Not started |

---

## Prerequisite: Assignments Refactor

**Why this must happen first:** `ServiceDocProps` currently embeds `assignments: AssignmentDoc[]`. The new `ServiceModel` (for sync) stores `ServiceCore` — it must not carry assignments, which are native app data, not RealGreen data. Keeping them separate is the correct architecture.

### What Changes

**`ServiceDocProps`** — remove `assignments`:
```typescript
export type ServiceDocProps = CreatedUpdated & {
  servId: number;
  // assignments removed
};
```

**`ServiceProps`** — add `assignments`:
```typescript
export type ServiceProps = {
  // ...existing fields...
  assignments: AssignmentDoc[];  // moved from ServiceDocProps
};
```

**`ServiceDocPropsModel`** — remove `assignmentSchema` and `assignments` field. The model becomes a thin `{ servId, createdAt, updatedAt }` document. (Consider whether this model is still needed at all after the sync is in place — it may be retired entirely.)

**New `AssignmentModel`** — standalone collection keyed by `servId`:
```typescript
// src/app/assignment/AssignmentModel.ts
const AssignmentSchema = new mongoose.Schema<AssignmentDoc>({
  servId: { type: Number, required: true, unique: true },
  employeeId: { type: String, required: true },
  schedDate: { type: String, required: true },
  status: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
}, { timestamps: true });
AssignmentSchema.index({ schedDate: 1 });
AssignmentSchema.index({ employeeId: 1, schedDate: 1 });
```

### Files to Modify

| File | Change |
|---|---|
| `ServiceTypes.ts` | Remove `assignments` from `ServiceDocProps`; add `assignments: AssignmentDoc[]` to `ServiceProps` |
| `ServiceDocPropsModel.ts` | Remove `assignmentSchema` and `assignments` field from schema |
| `baseService.ts` | Remove `assignments` from `baseServiceDocProps`; add `assignments: []` to `baseService` |
| `serviceServerFunc.ts` | `extendServices` no longer merges assignments (they come from state) |
| `hydrateLastAssigned.ts` | Remove `serviceDoc.assignments` read — only `newAssignments` param remains |
| `centralSelectors.ts` | Pass `centralDocPropsSelect.assignments` into `ServiceProps.assignments` during hydration |
| `assignment/AssignmentModel.ts` | **New file** — standalone `AssignmentDoc` collection |
| `assignment/api/route.ts` | Query `AssignmentModel` instead of `ServiceDocPropsModel` |
| `csv/api/route.ts` | Write to `AssignmentModel` instead of `ServiceDocPropsModel.assignments` |

### Key Invariant

All code that reads `service.assignments` (in `ServiceUtils`, `feedbackSelect`, `employeeLookbackUtils`) continues to work unchanged — `assignments` stays on the `Service` type, just sourced from `ServiceProps` (hydration layer) instead of `ServiceDocProps` (storage layer).

---

## Step 1: Confirm Core Field Names

The following fields were added as commented-out stubs in the Core types. Confirm names before uncommenting and wiring remap functions.

### `CustomerCore` — Pending Confirmation

| Raw field | Proposed Core name | Notes |
|---|---|---|
| `cancelCode` | `cancelCode` | |
| `cancelDate` | `cancelDate` | |
| `canceledBy` | `canceledBy` | |
| `cardExpiryDate` | `cardExpiryDate` | |
| `cardType` | `cardType` | |
| `companyName` | `companyName` | |
| `creditHoldStatus` | `creditHoldStatus` | |
| `doNotChargeInterest` | `doNotChargeInterest` | |
| `doNotPutOnCreditHold` | `doNotPutOnCreditHold` | |
| `firstName` | `firstName` | |
| `invoiceType` | `invoiceType` | |
| `isBilledWithMasterAccount` | `isBilledWithMasterAcct` | Shortened to match `isMasterAcct` convention |
| `isCanceled` | `isCanceled` | |
| `lastFourNumber` | `lastFourNumber` | |
| `masterAccountBranches` | `masterAcctBranches` | Shortened to match `masterAcctId` convention |
| `memo` | `memo` | |
| `memoAlert` | `memoAlert` | |
| `payAlert` | `payAlert` | |
| `prepayBalance` | `prepayBalance` | |
| `since` | `since` | Customer since date |
| `sizeSource` | `sizeSource` | |
| `sizeUnitOfMeasureID` | `sizeUnitOfMeasureId` | |
| `sourceCD` | `sourceCode` | Raw uses `sourceCD`; Core uses `sourceCode` for clarity |
| `statementFrequency` | `statementFrequency` | |
| `statementType` | `statementType` | |
| `title` | `title` | |

`billingEmail` is already added (unambiguous).

### `ProgramCore` — Pending Confirmation

| Raw field | Proposed Core name | Notes |
|---|---|---|
| `averageTime` | `avgTime` | Matches `avgPrice` convention |
| `cancelCode` | `cancelCode` | |
| `cancelDate` | `cancelDate` | |
| `canceledBy` | `canceledBy` | |
| `customerNote` | `custNote` | Shortened; matches `techNote` pattern |
| `customerNoteExpiration` | `custNoteExpiration` | |
| `dayCode` | `dayCode` | |
| `difficulty` | `difficulty` | |
| `isProgram` | `isProgram` | |
| `isRenewed` | `isRenewed` | |

### `ServiceCore` — Pending Confirmation

| Raw field | Proposed Core name | Notes |
|---|---|---|
| `round` | `round` | Route stop round number |

---

## Step 2: Wire `updated` Filter

After Core names are confirmed and remap functions are updated:

1. **Uncomment `updated` in `CustomerSearchRaw`** and add `updated?: TRange<string>` to `CustomerSearchCriteria`
2. **Uncomment `updated` in `ProgramSearchRaw`** and add `updated?: TRange<string>` to `ProgramSearchCriteria`
3. **Uncomment `updated` in `ServiceSearchRaw`** (already in `ServiceSearchCriteria` and `remapServSearch`)
4. **Update `remapCustSearch`** — add `if (search.updated) rgSearch.updated = toRGStringRange(search.updated);`
5. **Update `remapProgSearch`** — same pattern

---

## Step 3: Register Entity Types

In `syncEntityTypes.ts`, add:
```typescript
export const SYNC_ENTITY_TYPES = {
  callLog: "callLog",
  customer: "customer",
  program: "program",
  service: "service",
} as const;
```

---

## Step 4: Create Mongoose Models

### `CustomerModel`
- Natural key: `custId` (unique index)
- Stores: full `CustomerCore`
- Embedded sub-schemas: `Address` (×2), `ContactPreference`, `ContactPoint[]`, `AgingParams`
- Location: `src/app/realGreen/customer/models/CustomerModel.ts`

### `ProgramModel`
- Natural key: `progId` (unique index)
- Secondary index: `custId` (for customer-scoped queries)
- Secondary index: `season` (for season-scoped queries)
- Stores: full `ProgramCore`
- Location: `src/app/realGreen/customer/models/ProgramModel.ts`

### `ServiceModel`
- Natural key: `servId` (unique index)
- Secondary index: `progId`
- Secondary index: `custId`
- Secondary index: `season`
- Stores: full `ServiceCore` including embedded `ProductionCore` (with `ServiceHistoryCore`, `AppProductCore[]`, `DoneByCore[]`)
- TTL index: deferred (open question — see brainstorm)
- Location: `src/app/realGreen/customer/models/ServiceModel.ts`

---

## Step 5: Create Sync Functions

Follow the exact pattern of `callLogSyncFunc.ts`:

### `customerSyncFunc.ts`
```
src/app/realGreen/customer/sync/customerSyncFunc.ts
  fetchCustomers(rawSearch: CustomerSearchRaw): Promise<CustomerRaw[]>
  bulkUpsertCustomers(rawCustomers: CustomerRaw[]): Promise<number>
```
- `fetchCustomers` — capped exponential batch fetch, `PAGE_SIZE = 500`, `MAX_CONCURRENT = 8`
- `bulkUpsertCustomers` — `remapCustomers(raw)` → `CustomerModel.bulkWrite(...)` keyed by `custId`

### `programSyncFunc.ts`
```
src/app/realGreen/customer/sync/programSyncFunc.ts
  fetchPrograms(rawSearch: ProgramSearchRaw): Promise<ProgramRaw[]>
  bulkUpsertPrograms(rawPrograms: ProgramRaw[]): Promise<number>
```
- Keyed by `progId`

### `serviceSyncFunc.ts`
```
src/app/realGreen/customer/sync/serviceSyncFunc.ts
  fetchServices(rawSearch: ServiceSearchRaw): Promise<ServiceRaw[]>
  bulkUpsertServices(rawServices: ServiceRaw[]): Promise<number>
```
- Keyed by `servId`
- **Note:** `remapServices` calls `remapProduction` which throws on completed services missing data. The sync version must handle this gracefully — wrap in try/catch and skip/log corrupted production records rather than throwing.

---

## Step 6: Create Sync Routes

Each entity gets a sync folder following the callLog pattern:

```
src/app/realGreen/customer/sync/
  customerSyncFunc.ts
  CustomerSyncContract.ts
  api/route.ts

src/app/realGreen/program/sync/   ← or co-locate under customer/sync/
  programSyncFunc.ts
  ProgramSyncContract.ts
  api/route.ts

src/app/realGreen/service/sync/
  serviceSyncFunc.ts
  ServiceSyncContract.ts
  api/route.ts
```

**Contract shape** (same for all three):
```typescript
interface CustomerSyncContract extends ApiContract {
  syncCustomers: {
    params: { force?: boolean };
    result: DataResponse<{ synced: number; lastSyncedAt: string }>;
  };
}
```

**Route handler pattern** (same as `callLog/sync/api/route.ts`):
1. `getLastSyncedAt(SYNC_ENTITY_TYPES.customer)` — null if `force: true`
2. Build criteria with `updated` filter if `lastSyncedAt` exists
3. `remapCustSearch(criteria)` → `fetchCustomers(rawSearch)`
4. `bulkUpsertCustomers(rawCustomers)`
5. `setLastSyncedAt(SYNC_ENTITY_TYPES.customer, newTimestamp)`

**Initial sync strategy:** For the first full sync, use `force: true`. Services should be filtered to `serviceYear >= currentYear - 7` to limit initial volume (see brainstorm storage estimates).

---

## Step 7: Sandbox UI

Create `src/app/sandbox/customerSync/page.tsx` — copy the pattern from `src/app/sandbox/syncTest/page.tsx`.

Add buttons for:
- Customer Full Sync / Delta Sync
- Program Full Sync / Delta Sync
- Service Full Sync / Delta Sync (with season floor note)

---

## Step 8: Unmock `extendCustomers` and `extendPrograms`

After `CustomerModel` and `ProgramModel` exist, replace the mocked implementations:

```typescript
// CustomerFuncs.ts — replace mock with real Mongo read
export async function extendCustomers(remapped: CustomerCore[]): Promise<CustomerDoc[]> {
  return extendEntities<CustomerCore, CustomerDocProps, CustomerDoc>({
    cores: remapped,
    model: CustomerModel,
    idField: "custId",
    baseDocProps: baseCustomerDocProps,
  });
}
```

Same pattern for `extendPrograms`.

---

## Step 9: Add `dataSource` to `SearchScheme`

```typescript
// SearchScheme.ts
export type SearchScheme = {
  schemeName: string;
  dataSource: "live" | "synced";  // ← new
  steps: SearchStep[];
};
```

Update `searchSchemes.ts` — set `dataSource: "live"` on all existing schemes (no behavior change).

---

## Step 10: Add Mongo Query Functions for `activeCustomers`

Create Mongo equivalents of the `activeCustomers` scheme steps:

```typescript
// src/app/realGreen/customer/sync/mongoQueries.ts
async function getActiveCustomerDocs(): Promise<CustomerDoc[]>
async function getActiveProgramDocs(custIds: number[], season: number): Promise<ProgramDoc[]>
async function getActiveServiceDocs(progIds: number[], season: number): Promise<ServiceDoc[]>
```

These replace the RealGreen API calls for the `synced` path.

---

## Step 11: Update Route Handler

In `customer/api/route.ts`, branch on `dataSource` in `runSearchScheme`:

```typescript
const scheme = schemeFactory({ season, schemeParams });

if (scheme.dataSource === "synced") {
  // 1. Parallel delta sync: syncCustomers + syncPrograms + syncServices
  // 2. Mongo query (scheme-specific)
  // 3. Stream results in same StreamChunk format
} else {
  // Existing pipeline (unchanged)
}
```

The `activeCustomers` scheme is the proof-of-concept. Flip it to `"synced"`, validate, then migrate remaining schemes one at a time.

---

## Step 12: Validate

Compare Mongo query results against the live pipeline for the same season:
- Record counts should match (within tolerance for corrupted RealGreen records)
- Spot-check specific customers for data fidelity
- Measure load time improvement (target: ~2s vs. current ~30s)

---

## Notes

- **`remapProduction` in sync context:** The current implementation throws on completed services with missing production data. The sync func must catch these and log them rather than aborting the entire batch.
- **Concurrent request concern:** Multiple users hitting `runSearchScheme` simultaneously will each trigger a delta sync. For v1 this is acceptable. A future sync lock (module-level promise) can prevent redundant concurrent syncs.
- **`refreshCustomer` simplification:** After sync is in place, `refreshCustomer` can be simplified to: sync customer/programs/services with `customerID: [custId]` filter, then re-query Mongo. Much simpler than re-running the full scheme pipeline.
- **TTL on services:** Deferred. Will be decided after initial sync validates storage estimates.
