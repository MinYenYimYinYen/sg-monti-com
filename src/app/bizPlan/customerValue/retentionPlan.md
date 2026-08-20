# Retention Plan

## Goal

Add multi-season customer retention and churn analysis to the `customerValue` feature. The result is a new **Retention** tab that shows year-over-year retention rates and churn patterns at the service, program, and customer levels — data that tells a compelling story to a prospective business purchaser.

---

## Background & Decisions

### Why Multi-Season Data?

The existing `customerValue` feature loads only the current season's active customers. Retention analysis requires knowing which customers, programs, and services were present in prior seasons. We need completed services (`status === "S"`) from the past 4 seasons.

### Season Count: 4 Prior Seasons (Fixed)

`globalSettingsSelect.season` is the current season (e.g., `2026`). We load completed services for seasons `[season - 4, season - 1]` inclusive. This gives 4 year-over-year retention rates and enough history to detect meaningful churn patterns.

### Data Shape: Hybrid (Full Hydration + Season-Partitioned Selectors)

We do **not** create lightweight copies or new entity types. The existing `Customer → Program → Service` hierarchy is fully hydrated as always. A new selector layer (`customerValueSeasonSelect.ts`) sits between the central maps and `customerValueFilterSelect.ts` and partitions the data by season using simple array filters on the existing types.

- `currentSeasonCustomers` — customers whose programs/services belong to the current season (feeds existing selectors unchanged)
- `historicalCustomersBySeason` — `Map<season, Customer[]>` where each customer's `programs` array is filtered to that season's data

No new types are introduced for this partitioning — `Customer`, `Program`, and `Service` are the types. We're filtering references, not copying objects.

### Scheme Design: `multiSeasonProduction`

A new search scheme that loads completed services across a season range, then resolves their programs and customers:

1. **Services** (Pagination) — `status === "S"`, `season: { min: season - 4, max: season - 1 }`
2. **Programs** (Batch) — by `progId` extracted from services, no season filter (we just need the program record to resolve `progCode`)
3. **Customers** (Batch) — by `custId` extracted from programs, no status filter (historical customers may be cancelled now)

This is intentionally incomplete — we only load programs that held completed services, not all programs for each customer. That's correct for retention analysis: we only care about revenue-producing relationships.

### Hook: No `autoLoad`

`useMultiSeasonProduction` returns a `load` function instead of auto-loading. Loading 4 seasons of completed services is a heavy, metered API call. The user triggers it explicitly.

### JSON Save/Load: Permanent Feature, Client-Side Only

No server round-trip. The hook serializes the slice's `{ customerDocs, programDocs, serviceDocs }` to a `.json` file (browser download) and reads it back via a file picker (dispatching `mergeData` into the target slice). This lives in `src/app/realGreen/customer/json/` and is reusable across any customer context.

### Retention Logic: Presence-Based, Revenue-Annotated

- **Retained**: an entity (service/program/customer) is retained if it appears in both season N and season N+1
  - Service: same `custId` + `servCodeId` in both seasons
  - Program: same `custId` + `progCodeId` with any retained service
  - Customer: same `custId` with any retained program
- **Revenue**: reported alongside retention as a separate metric (not used to determine retention status)
- **Churn**: an entity is churned if it was active in season N, absent in season N+1..N+X, and active again in season N+X+1

### Display: Dynamic Columns Per Season Loaded

The retention table generates one column per season. Churn analysis lives in the same tab as a second section below the retention table.

---

## Architecture

### New Files

#### 1. `searchSchemes.ts` — Add `multiSeasonProduction`

```typescript
// src/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchSchemes.ts

const multiSeasonProduction = ({ season }: SearchSchemeParams): SearchScheme => {
  return {
    schemeName: "multiSeasonProduction",
    steps: [
      createPaginationStep({
        stepName: "services",
        optimizerKey: "multiSeasonServices",
        searchCriteria: {
          season: { min: season - 4, max: season - 1 },
          servStats: getServiceStatuses(["completed"]),
        },
      }),
      createBatchSizeStep({
        stepName: "programs",
        optimizerKey: "multiSeasonPrograms",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ServiceDoc[]).map((s) => s.progId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({ progIds: ids }),
      }),
      createBatchSizeStep({
        stepName: "customers",
        optimizerKey: "multiSeasonCustomers",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ProgramDoc[]).map((p) => p.custId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({ custIds: ids }),
      }),
    ],
  };
};

export const searchScheme = {
  // ...existing schemes...
  multiSeasonProduction,
};
```

#### 2. `customerSlices.ts` — Add `multiSeasonProduction` Slice

Follow the exact same pattern as `lastSeasonProduction`. Add:
- `multiSeasonProductionSlice`
- `multiSeasonProductionGetDocs`
- `multiSeasonProductionActions`
- `multiSeasonProductionReducer`
- Registry entry: `{ context: "multiSeasonProduction", ... }`
- Add `"multiSeasonProduction"` to `CustomerContextMode` union

The exhaustiveness check at the bottom of the file will enforce this.

#### 3. `hooks/useMultiSeasonProduction.ts`

```typescript
// src/app/realGreen/customer/hooks/useMultiSeasonProduction.ts

export function useMultiSeasonProduction() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  const load = () => {
    if (!season) return;
    dispatch(
      multiSeasonProductionGetDocs({
        params: { schemeName: "multiSeasonProduction", season },
        config: { loadingMsg: "Loading multi-season production data..." },
      }),
    );
  };

  return { load, canLoad: !!season };
}
```

No `autoLoad`. The user triggers loading explicitly from the Retention tab UI.

#### 4. `src/app/realGreen/customer/json/`

**`useCustomerJson.ts`**

```typescript
// Hook API
export function useCustomerJson(context: CustomerContextMode) {
  // save(): reads state.customer[context].{customerDocs, programDocs, serviceDocs}
  //         serializes to JSON, triggers browser download
  // load(): opens file picker, reads JSON, dispatches mergeData into the target slice
  return { save, load };
}
```

**`CustomerJsonPanel.tsx`**

A reusable component that renders Save/Load buttons with record count metadata. Accepts a `context` prop. Can be dropped into any feature that uses a customer context.

```tsx
<CustomerJsonPanel context="multiSeasonProduction" />
```

#### 5. `customerValueSeasonSelect.ts` — Season-Partitioned Selector Layer

```typescript
// src/app/bizPlan/customerValue/customerValueSeasonSelect.ts

// Reads from centralSelect.customers (merged active + multiSeasonProduction)
// Partitions by season using service.season

const selectCurrentSeasonCustomers = createSelector(
  [centralSelect.customers, globalSettingsSelect.season],
  (customers, season): Customer[] =>
    customers
      .map((customer) => ({
        ...customer,
        programs: customer.programs
          .filter((program) => program.season === season)
          .map((program) => ({
            ...program,
            services: program.services.filter((service) => service.season === season),
          })),
      }))
      .filter((customer) => customer.programs.length > 0),
);

const selectHistoricalCustomersBySeason = createSelector(
  [centralSelect.customers, globalSettingsSelect.season],
  (customers, currentSeason): Map<number, Customer[]> => {
    const map = new Map<number, Customer[]>();
    // For each prior season, build a filtered view of customers
    for (let s = currentSeason - 4; s < currentSeason; s++) {
      const season = s;
      const seasonCustomers = customers
        .map((customer) => ({
          ...customer,
          programs: customer.programs
            .filter((program) => program.season === season)
            .map((program) => ({
              ...program,
              services: program.services.filter(
                (service) => service.season === season && service.status === "S",
              ),
            })),
        }))
        .filter((customer) => customer.programs.length > 0);
      map.set(season, seasonCustomers);
    }
    return map;
  },
);

export const customerValueSeasonSelect = {
  currentSeasonCustomers: selectCurrentSeasonCustomers,
  historicalCustomersBySeason: selectHistoricalCustomersBySeason,
};
```

> **Note on spread vs references**: The `{ ...customer, programs: [...] }` spread creates a new object with a filtered `programs` array, but the individual `Program` and `Service` objects inside are the same references. Full hydration (flags, tax codes, `ServiceUtils`, etc.) is preserved on all nested objects.

#### 6. `retentionLogic.ts` — Pure Business Logic

```typescript
// src/app/bizPlan/customerValue/retention/retentionLogic.ts
// Self-contained. Bite-size functions. Dr. Bob approved.

// --- Types ---

type RetentionRate = {
  fromSeason: number;
  toSeason: number;
  priorCount: number;
  retainedCount: number;
  rate: number;           // retainedCount / priorCount
  priorRevenue: number;
  retainedRevenue: number;
  revenueRate: number;    // retainedRevenue / priorRevenue
};

type ChurnRecord = {
  id: number;                              // custId | progId | servId
  activeSeasons: number[];
  cancelledSeasons: number[];
  revenueByActiveSeason: Map<number, number>;
};

// --- Service-Level Retention ---

// A service identity is (custId, servCodeId). It is retained if it appears in both seasons.
function getServiceIdentity(service: Service): string {
  return `${service.program.customer.custId}:${service.servCodeId}`;
}

function buildServiceIdentitySet(customers: Customer[]): Set<string> {
  const identities = new Set<string>();
  for (const customer of customers) {
    for (const program of customer.programs) {
      for (const service of program.services) {
        identities.add(getServiceIdentity(service));
      }
    }
  }
  return identities;
}

function computeServiceRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate {
  const priorIdentities = buildServiceIdentitySet(priorCustomers);
  const currentIdentities = buildServiceIdentitySet(currentCustomers);

  let retainedCount = 0;
  let priorRevenue = 0;
  let retainedRevenue = 0;

  for (const customer of priorCustomers) {
    for (const program of customer.programs) {
      for (const service of program.services) {
        const revenue = service.x.getPriceAfterDiscounts("price");
        priorRevenue += revenue;
        if (currentIdentities.has(getServiceIdentity(service))) {
          retainedCount++;
          retainedRevenue += revenue;
        }
      }
    }
  }

  const priorCount = countServices(priorCustomers);
  return {
    fromSeason,
    toSeason,
    priorCount,
    retainedCount,
    rate: priorCount > 0 ? retainedCount / priorCount : 0,
    priorRevenue,
    retainedRevenue,
    revenueRate: priorRevenue > 0 ? retainedRevenue / priorRevenue : 0,
  };
}

// --- Program-Level Retention ---

// A program identity is (custId, progCodeId). It is retained if any of its services are retained.
function computeProgramRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate { ... }

// --- Customer-Level Retention ---

// A customer is retained if any of their programs are retained.
function computeCustomerRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate { ... }

// --- Churn Detection ---

// For each entity identity, build its timeline across all seasons.
// An entity is churned if it was active, then absent, then active again.
function buildChurnRecords(
  customersBySeason: Map<number, Customer[]>,
  seasons: number[],
  level: "service" | "program" | "customer",
): ChurnRecord[] { ... }

// Query: entities absent for exactly x seasons between active seasons.
function getChurnedFor(records: ChurnRecord[], x: number): ChurnRecord[] {
  return records.filter((r) => r.cancelledSeasons.length === x);
}

// Query: entities that returned after being absent for at least x seasons.
function getReturnedAfter(records: ChurnRecord[], x: number): ChurnRecord[] {
  return records.filter((r) => r.cancelledSeasons.length >= x && r.activeSeasons.length > 1);
}

// Helper: count services across all customers
function countServices(customers: Customer[]): number { ... }
```

#### 7. `retentionSelect.ts` — Redux Selectors

```typescript
// src/app/bizPlan/customerValue/retention/retentionSelect.ts

// Reads from customerValueSeasonSelect.historicalCustomersBySeason
// Computes RetentionRate[] for each consecutive season pair
// Exposes selectors at service, program, and customer levels

const selectSeasons = createSelector(
  [globalSettingsSelect.season],
  (currentSeason): number[] =>
    [currentSeason - 4, currentSeason - 3, currentSeason - 2, currentSeason - 1, currentSeason],
);

const selectServiceRetentionRates = createSelector(
  [customerValueSeasonSelect.historicalCustomersBySeason, customerValueSeasonSelect.currentSeasonCustomers, selectSeasons],
  (historicalBySeason, currentCustomers, seasons): RetentionRate[] => {
    // For each consecutive pair, compute service retention
    // Last pair uses currentSeasonCustomers as the "to" side
  },
);

// Similar selectors for program and customer levels

export const retentionSelect = {
  seasons: selectSeasons,
  serviceRetentionRates: selectServiceRetentionRates,
  programRetentionRates: selectProgramRetentionRates,
  customerRetentionRates: selectCustomerRetentionRates,
  serviceChurnRecords: selectServiceChurnRecords,
  programChurnRecords: selectProgramChurnRecords,
  customerChurnRecords: selectCustomerChurnRecords,
};
```

#### 8. `customerValue/retention/` — New Tab

**File structure:**
```
src/app/bizPlan/customerValue/retention/
  page.tsx                    ← Retention tab root
  RetentionTable.tsx          ← Dynamic-column table (service/program/customer)
  RetentionDrillDown.tsx      ← Sheet/drawer with level selector + progCodeId picker
  churnSelect.ts              ← Churn-specific selectors (xYearChurn, returnedAfter)
```

**`RetentionTable`** renders a table with:
- Rows: Count, Revenue, Retained (count + %), Retained Revenue (amount + %), Churned (returned count)
- Columns: one per season loaded (dynamic, based on `retentionSelect.seasons`)
- Clicking a cell opens `RetentionDrillDown`

**`RetentionDrillDown`** (Sheet):
- Level selector at top: Customer / Program / Service
- When Program: `progCodeId` dropdown appears
- When Service: `progCodeId` required first, then `servCodeId` dropdown
- Table updates to show retention/churn for the selected entity

---

### Modified Files

#### `customerValueFilterSelect.ts`

Change the input selector from `centralSelect.customers` to `customerValueSeasonSelect.currentSeasonCustomers`. This is a one-line change in `selectActiveCustomers`. All downstream selectors (`byZipCodeSelect`, `byProgramSelect`) are unaffected.

```typescript
// Before
const selectActiveCustomers = createSelector(
  [centralSelect.customers],
  ...
);

// After
const selectActiveCustomers = createSelector(
  [customerValueSeasonSelect.currentSeasonCustomers],
  ...
);
```

#### `useCustomerValueDeps.ts`

Add the new context and hook:

```typescript
export function useCustomerValueDeps() {
  useCustomerContext({ contexts: ["active", "multiSeasonProduction"] });
  useActiveCustomers({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useZipCode({ autoLoad: true });
  // Note: useMultiSeasonProduction is NOT called here with autoLoad.
  // The user triggers it from the Retention tab UI.
}
```

#### `customerValue/layout.tsx`

Add "Retention" to `NAV_LINKS`:

```typescript
const NAV_LINKS = [
  { label: "By Zip Code", href: "/bizPlan/customerValue/byZipCode" },
  { label: "By Program", href: "/bizPlan/customerValue/byProgram" },
  { label: "Retention", href: "/bizPlan/customerValue/retention" },
] as const;
```

---

## Retention Table — Display Spec

### Main Table (Customer Level by default)

| Metric | 2022 | 2023 | 2024 | 2025 | 2026 (Active) |
|---|---|---|---|---|---|
| Count | 450 | 480 | 510 | 530 | 545 |
| Revenue | $420K | $455K | $490K | $515K | $540K |
| Retained | — | 380 (84%) | 410 (85%) | 445 (87%) | 490 (92%) |
| Retained Revenue | — | $385K (85%) | $415K (85%) | $448K (87%) | $498K (92%) |
| Churned (returned) | — | 70 | 70 | 65 | 40 |
| Churned Revenue | — | $65K | $58K | $52K | $35K |

- "Retained" in column N = entities from season N-1 that also appear in season N
- "Churned (returned)" in column N = entities that cancelled after season N-1 but eventually returned in any later season
- Revenue uses `service.x.getPriceAfterDiscounts("price")`

### Churn Analysis Section (below main table)

A secondary table showing the distribution of churn duration:

| Absent For | Count | Revenue Lost | Revenue Recovered |
|---|---|---|---|
| 1 season | 45 | $42K | $38K |
| 2 seasons | 28 | $26K | $21K |
| 3+ seasons | 12 | $11K | $8K |

**Narrative stat** (prominent display): "X% of customers who cancel return within 2 seasons."

---

## Drill-Down Sheet — Interaction Design

The drill-down sheet is opened by clicking any cell in the retention table (or a dedicated "Drill Down" button).

**Level selector** (top of sheet):
- `Customer` — shows the main table filtered to a specific customer (or all customers)
- `Program` — requires selecting a `progCodeId` from a dropdown; shows retention for that program type
- `Service` — requires `progCodeId` first, then `servCodeId`; shows retention for that specific service line

The table inside the sheet uses the same `RetentionTable` component with filtered data inputs.

---

## Implementation Order

1. **`multiSeasonProduction` scheme** — add to `searchSchemes.ts`
2. **Slice + registry** — add to `customerSlices.ts`
3. **`useMultiSeasonProduction` hook** — new file
4. **`CustomerJsonPanel` + `useCustomerJson`** — new files in `customer/json/`
5. **`customerValueSeasonSelect.ts`** — new file, season partitioning
6. **Update `customerValueFilterSelect.ts`** — swap input selector
7. **Update `useCustomerValueDeps.ts`** — add new context
8. **Update `layout.tsx`** — add Retention tab
9. **`retentionLogic.ts`** — pure business logic functions
10. **`retentionSelect.ts`** — Redux selectors
11. **`retention/page.tsx` + `RetentionTable.tsx` + `RetentionDrillDown.tsx`** — UI

---

## Open Questions (Deferred)

- **Drill-down sheet**: Should clicking a specific customer row in the drill-down navigate to the single-customer view, or stay in the sheet?
- **Export**: Should the retention table support JSON/CSV export like `byProgram` does?
- **Churn narrative stat**: Where exactly does "X% of customers who cancel return within 2 seasons" live — in the table header, a card above the table, or the drill-down sheet?

---

## Future Metrics (Potential Additions)

The following datapoints are derivable from the existing `ChurnRecord[]` and `RetentionRate` data but are deferred for a future update. All are computable without architectural changes.

### Revenue Lost (pre-churn)
The revenue from a customer's **last active season before their absence** — the complement to the existing `revenueRecovered`. This tells the full story: "We lost $42K when they left, and recovered $38K when they came back." The data is already in `revenueByActiveSeason`; it's the season immediately before the first cancelled season.

### Permanent Churn Count + Revenue
Customers who left and **never returned** within the loaded window. Derivable from `ChurnRecord[]` by filtering records where the last active season precedes the last cancelled season. This is arguably the most important number for a buyer — it represents true, unrecoverable attrition.

### New Customer Acquisition per Season
For each season transition, `currentCount − retainedCount` = net new customers that season. This is already computable from the existing `RetentionRate` data (just needs a `newCount` field added to `RetentionRate` or a derived selector). Retention tells half the story; acquisition tells the other half.

### Churn by Program Type
A breakdown of the churn distribution grouped by `progCodeId` — which service types are stickiest, and which are most likely to be dropped. The program-level `ChurnRecord[]` already exists in `retentionSelect.programChurnRecords` but is not surfaced in the UI.

### Average Absence Duration
For customers who did return, the mean number of seasons they were gone. A single number: `mean(absenceLength)` across all `ChurnRecord[]` with `activeSeasons.length >= 2`. Useful for the narrative: "Customers who return typically come back within 1.4 seasons."

### Cohort Survival Rate
Tracks a **fixed cohort** of customers (e.g., all customers active in 2022) across every subsequent season, rather than comparing adjacent seasons independently. This strips out the effect of new acquisitions and shows the true long-term stickiness of a customer relationship — the question a buyer is really asking.

**Why deferred**: Cohort survival is most meaningful with 8–10+ seasons of history. Loading that many seasons of completed services is a large API call. The current 4-season window gives a partial picture. When/if the historical window is expanded (via a configurable season range in the UI), cohort survival should be the first metric added. The JSON save/load feature means the data only needs to be fetched once.
