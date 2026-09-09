# Price Increase Results — Data Layer

This folder contains the selector layer that computes per-customer and per-service price increase results from the active settings and customer data.

---

## Agent Context — Read This First

Before working in this folder, read **only** the files listed below. Do **not** read any file outside this list without first asking the user for explicit permission.

### Required Reading

**Module intent and settings object description**
- `src/app/priceIncrease/priceIncreasePlan.md` — read for general intent only; ignore the Required Reading list inside that file

**Existing price increase types and math**
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `SeasonIncrease`, `IncreaseFlag`, `IncreaseFlagMapping` (note: `PriceIncreaseResult` and `ServiceIncreaseBreakdown` are legacy types from an unused selector — do not use them)
- `src/app/priceIncrease/_lib/priceIncreaseFuncs.ts` — pure math functions: `calcSeasonCount`, `calcPlannedIncreasePercent`, `calcUpsellAdjustment`, `applyIncreaseCaps`, `resolveIncreaseFlag`

**Entry point (settings + season plan + target season + view config)**
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSelect.ts` — `settings` (source of truth for active settings, draft-aware); `targetSeason` (effective planning season, override-aware); `viewConfig` (sort/group state)
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSlice.ts` — `IncreaseViewConfig` type; `viewConfig` actions (`setViewSortKeys`, `addViewSortKey`, `removeViewSortKey`, `setViewGroupKey`, `setViewActiveGroup`, `resetViewConfig`)
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts` — `activeDoc` (the active season increases plan)
- `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts` — `PriceIncreaseSettingsDoc` shape
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts` — `SeasonIncreasesDoc` shape

**Result types**
- `src/app/priceIncrease/results/increaseResultsTypes.ts` — `ServiceIncreaseResult`, `IncreaseDataIssue`, `ServiceIncreaseOutcome`
- `src/app/priceIncrease/results/customerIncreaseResultsTypes.ts` — `CustomerIncreaseResult`, `SortableIncreaseProperties`, `GroupableIncreaseProperties`

**Sort/group registries**
- `src/app/priceIncrease/results/customerIncreaseSortFns.ts` — `customerIncreaseSortFns`, `customerIncreaseSortLabels`, `CustomerIncreaseSortKey`
- `src/app/priceIncrease/results/customerIncreaseGroupFns.ts` — `customerIncreaseGroupFns`, `customerIncreaseGroupLabels`, `CustomerIncreaseGroupKey`, `groupCustomerIncreaseResults`

**Customer data shapes**
- `src/app/realGreen/customer/_lib/entities/types/CustomerTypes.ts` — `Customer` shape
- `src/app/realGreen/customer/_lib/entities/types/ProgramTypes.ts` — `Program` shape (key fields: `progCode.progCodeId`, `dateSold`, `status`)
- `src/app/realGreen/customer/_lib/entities/types/ServiceTypes.ts` — `Service` shape (key fields: `nextSize`, `nextPrice`)
- `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts` — `acquisitionPrice` getter (reads from `service.program.x.priceTable`, which is already econ/pref-aware via `ProgramUtils.isEcon`)
- `src/app/realGreen/customer/_lib/classes/ProgramUtils.ts` — `isEcon`, `priceTable`, `revenue(method)` getters
- `src/app/realGreen/customer/_lib/classes/CustomerUtils.ts` — `revenue(method)` method (sums active programs)
- `src/app/realGreen/customer/selectors/centralSelectors.ts` — `centralSelect.customers` (fully hydrated `Customer[]`)

**Data loading — critical**
- `src/app/priceIncrease/usePriceIncreaseDeps.ts` — must call `useCustomerContext({ contexts: ["active"] })` to load customers into the active context. Without this, `centralSelect.customers` returns an empty array and all selectors produce no results.

---

## Architecture Intent

### Entry Point

`priceIncreaseConfigSelect.settings` is the single source of truth for the active `PriceIncreaseSettingsDoc`. It returns the live draft when the settings sheet is open (allowing real-time preview of config changes), otherwise falls back to the active stored settings. All selectors in this folder consume it as their settings input.

`seasonIncreasesSelect.activeDoc` provides the `SeasonIncreasesDoc` referenced by the active settings.

### Target Season

`priceIncreaseConfigSelect.targetSeason` is the effective planning season used for all `calcSeasonCount` calls. It is **not** a settings field — it is managed via `localStorage` (key: `"priceIncrease.targetSeason"`, 6-month TTL) and synced to `priceIncreaseConfigSlice.targetSeasonOverride` by the layout on mount. Falls back to `globalSettings.season` when no override is set.

**Do not use `globalSettingsSelect.season` directly** anywhere in this module. Always use `priceIncreaseConfigSelect.targetSeason`.

Use case: when running 2026 production but planning for 2027, the user sets the target season to 2027 via the `TargetSeasonControl` in the layout header. This corrects season counts for all customers without modifying stored settings.

### Customer Bucketing

Because settings only allow a single `progCodeId`, customers fall into two buckets:

- **Matched**: has at least one program whose `progCode.progCodeId` matches `settings.progCodeId`
- **Unmatched**: no program with a matching `progCodeId`

Only matched customers participate in price increase calculations. The matched/unmatched split lives in `serviceIncreaseResultsSelect.ts` since it is a prerequisite for service-level computation.

### Econ vs Preferred Pricing

`ServiceUtils.acquisitionPrice` calls `service.program.x.priceTable`, which is `ProgramUtils.priceTable`. That getter already routes to the economy price table when `ProgramUtils.isEcon` is true and an econ table is configured. The econ/pref determination is therefore **already correct** for acquisition price — no additional logic is needed in this layer.

### Pipeline Order

1. Compute raw per-service results (`ServiceIncreaseResult[]`) — no caps, no bonus
2. Aggregate to a single customer-level number (`rawPercent` — size-weighted average of `planDiffPercent`)
3. Apply upsell bonus → `calculatedPercent`
4. Apply caps → `cappedPercent`
5. Resolve the flag against `cappedPercent`

Caps and upsell bonus are applied **after** aggregation, not at the service level. `rawPercent` (pre-bonus, pre-cap) is preserved on `CustomerIncreaseResult` because `needsManualAttention` must be evaluated against it — after caps are applied, nothing will exceed the threshold.

### View Configuration (Sort / Group)

`priceIncreaseConfigSelect.viewConfig` holds the active `IncreaseViewConfig`:

```typescript
type IncreaseViewConfig = {
  sortKeys: CustomerIncreaseSortKey[];   // ordered list, primary first
  groupKey: CustomerIncreaseGroupKey | null;
  activeGroup: string | null;
};
```

Sort and group functions are pure registries typed as `Record<K, Fn>` — TypeScript enforces that every key in `SortableIncreaseProperties` / `GroupableIncreaseProperties` has a corresponding function. Adding a new sortable/groupable property requires updating the type AND the registry.

`applyIncreaseView(results, viewConfig)` is the single function that applies multi-sort and grouping. It returns a discriminated union:
- `{ grouped: false, results }` — flat sorted list
- `{ grouped: true, groups, activeGroup, activeResults }` — partitioned into labeled groups

**Capturing a view for permanent use:** configure sort/group in the UI, then `console.log(store.getState().priceIncreaseConfig.viewConfig)` to get the serializable config. Named constants can be created from this output and used as preset buttons or initial state.

---

## File 1: `increaseResultsTypes.ts` — Service-Level Types

Defines `ServiceIncreaseResult`, `IncreaseDataIssue`, and `ServiceIncreaseOutcome`.

### `ServiceIncreaseResult`

```typescript
type ServiceIncreaseResult = {
  customer: Customer;      // convenience reference — same as service.program.customer
  service: Service;        // full hydrated service — source of truth for nextPrice, servId, size, etc.
  plannedPercent: number;  // calcPlannedIncreasePercent result — compounded increase from acqPrice
  acqPrice: number;        // service.x.acquisitionPrice — theoretical price-table starting price (econ/pref-aware)
  planPrice: number;       // acqPrice * (1 + plannedPercent / 100)
  planDiff: number;        // planPrice - service.nextPrice (positive = increase needed)
  planDiffPercent: number; // (planDiff / service.nextPrice) * 100 — raw % increase to reach plan price
};
```

**Design notes:**
- `customer` and `service` are carried by reference for downstream convenience. Safe because this type is only used in selector output, never stored in Redux.
- Caps, upsell bonus, and flag resolution are **not** applied here. Those belong in `customerIncreaseResultsSelect`.

### `IncreaseDataIssue`

```typescript
type IncreaseDataIssue = {
  custId: number;
  progId: number;
  servId?: number;  // present for service-level issues (acqPrice); absent for program-level (dateSold)
  missingField: "acqPrice" | "dateSold";
  message: string;
};
```

### `ServiceIncreaseOutcome`

```typescript
type ServiceIncreaseOutcome =
  | { ok: true; result: ServiceIncreaseResult }
  | { ok: false; issue: IncreaseDataIssue };
```

---

## File 2: `makeServiceIncreaseResult.ts` — Pure Computation Function

**Single source of truth** for how a `ServiceIncreaseOutcome` is produced from a single service.

Returns `{ ok: false, issue }` when required data is missing:
- `dateSold` empty/invalid → `missingField: "dateSold"` — safety net; primary guard is in the selector's program loop
- no price table → `missingField: "acqPrice"` — primary per-service guard

**Inputs:**
- `service: Service`
- `dateSold: string` — from `program.dateSold`
- `currentSeason: number` — from `priceIncreaseConfigSelect.targetSeason` (not `globalSettingsSelect.season`)
- `seasonIncreases: SeasonIncrease[]` — from `seasonIncreasesSelect.activeDoc`
- `ongoingIncrease: number` — from `settings.ongoingIncrease`

---

## File 3: `serviceIncreaseResultsSelect.ts` — Customer Bucketing + Service-Level Selector

**Status: Implemented.**

Splits customers into matched/unmatched buckets, then for each matched customer's target program:
1. Guards `dateSold` at the program level — emits one `IncreaseDataIssue` and skips the program if missing
2. Iterates services and calls `makeServiceIncreaseResult` for each
3. Routes outcomes: successes → `serviceIncreaseResultMap`, failures → `dataIssues`

Uses `priceIncreaseConfigSelect.targetSeason` for `currentSeason`.

### Exported selectors

| Selector | Returns |
|---|---|
| `bucketedCustomers` | `{ matched: Array<{ customer, targetProgram }>, unmatched: Customer[] }` |
| `matchedCustomers` | `Array<{ customer: Customer, targetProgram: Program }>` |
| `unmatchedCustomers` | `Customer[]` |
| `serviceIncreaseResultMap` | `Map<custId, ServiceIncreaseResult[]>` — only customers with ≥1 priceable service |
| `serviceIncreaseResultsArray` | `ServiceIncreaseResult[]` — all results flattened |
| `byCustomer` | `Map<custId, ServiceIncreaseResult[]>` — semantic alias for `serviceIncreaseResultMap` |
| `dataIssues` | `IncreaseDataIssue[]` — program-level and service-level issues for UI display |

---

## File 4: `customerIncreaseResultsTypes.ts` — Customer-Level Types

Defines the type hierarchy for the aggregation layer.

### `SortableIncreaseProperties`

Numeric properties pre-computed on each `CustomerIncreaseResult` for sorting. TypeScript enforces that every key has a corresponding entry in `customerIncreaseSortFns`.

```typescript
type SortableIncreaseProperties = {
  increaseDollar: number;   // sum of planDiff across services
  increasePercent: number;  // cappedPercent
  rawPercent: number;       // before upsell bonus and caps
  customerRevenue: number;  // customer.x.revenue("renewal")
  programRevenue: number;   // targetProgram.x.revenue("renewal")
  seasonCount: number;      // calcSeasonCount result
};
```

### `GroupableIncreaseProperties`

Boolean properties pre-computed for grouping. TypeScript enforces that every key has a corresponding entry in `customerIncreaseGroupFns`.

```typescript
type GroupableIncreaseProperties = {
  isExempt: boolean;
  isManual: boolean;
  needsManualAttention: boolean;  // rawPercent > maxIncreaseNow + manualAttentionThreshold
  hasIncreaseFlag: boolean;       // customer has one of the increaseFlagMappings flags
  isOverpriced: boolean;          // cappedPercent < 0
  isBelowAcquisition: boolean;    // any service where nextPrice < acqPrice
};
```

### `CustomerIncreaseResult`

```typescript
type CustomerIncreaseResult = {
  customer: Customer;
  targetProgram: Program;
  serviceResults: ServiceIncreaseResult[];
  rawPercent: number;        // size-weighted avg of planDiffPercent — before bonus/caps
  calculatedPercent: number; // after upsell bonus
  cappedPercent: number;     // after caps — used for flag resolution
  resolvedFlag: IncreaseFlag | null;
  sortable: SortableIncreaseProperties;
  groupable: GroupableIncreaseProperties;
};
```

---

## File 5: `customerIncreaseResultsSelect.ts` — Customer-Level Aggregation

**Status: Implemented.**

Builds on `serviceIncreaseResultsSelect.matchedCustomers` and `byCustomer`. For each matched customer:
- Exempt customers are included with zeroed percents and `isExempt: true`
- Customers with no priceable services (all data issues) are excluded
- Aggregation: size-weighted average of `planDiffPercent` → upsell bonus → caps → flag resolution
- Pre-computes all `sortable` and `groupable` properties

### Exported selectors

| Selector | Returns |
|---|---|
| `results` | `CustomerIncreaseResult[]` — all matched customers (including exempt) |

---

## Sort/Group Registries

### `customerIncreaseSortFns.ts`

`customerIncreaseSortFns: Record<keyof SortableIncreaseProperties, SortFn>` — all sorts descending by default.
`customerIncreaseSortLabels: Record<keyof SortableIncreaseProperties, string>` — UI labels.
`CustomerIncreaseSortKey` — union of all sort key names.

### `customerIncreaseGroupFns.ts`

`customerIncreaseGroupFns: Record<keyof GroupableIncreaseProperties, GroupFn>` — each function returns a group label string.
`customerIncreaseGroupLabels: Record<keyof GroupableIncreaseProperties, string>` — UI labels.
`CustomerIncreaseGroupKey` — union of all group key names.
`groupCustomerIncreaseResults(results, groupKey)` — utility that returns `Map<groupLabel, CustomerIncreaseResult[]>`.

---

## `_lib/applyIncreaseView.ts` — View Application

Pure function: `applyIncreaseView(results, viewConfig) → AppliedIncreaseView`

```typescript
type AppliedIncreaseView =
  | { grouped: false; results: CustomerIncreaseResult[] }
  | { grouped: true; groups: Map<string, CustomerIncreaseResult[]>; activeGroup: string; activeResults: CustomerIncreaseResult[] };
```

Applies multi-sort (chained comparators in priority order) then optional grouping. When grouped, defaults `activeGroup` to the first group if the stored value is null or stale.

---

## UI Components (`_components/`)

### `DataIssuesPopover.tsx`
Renders in the `priceIncrease` layout header (left slot, alongside `TargetSeasonControl`). Reads `serviceIncreaseResultsSelect.dataIssues`.
- No issues → grayed out, non-interactive
- Has issues → destructive border/text with count; opens a popover with an `Accordion` grouped by `missingField`

### `CustomerIncreaseCard.tsx`
Receives `result: CustomerIncreaseResult`. Displays:
- **Customer header**: `CustomerLink` (opens RealGreen), increase-module flag badges, Exempt/Review status badges, resolved flag name, capped percent, customer renewal revenue, program code badges
- **Renewal flags row** (conditional): badges for renewal flags the customer has
- **Program metadata row**: Econ/Pref badge, sold date (via `prettyDate`), season count, program renewal revenue
- **Column headers + `ServiceIncreaseRow` per service** (hidden for exempt customers)

### `ServiceIncreaseRow.tsx`
Receives a single `ServiceIncreaseResult`. 6-column grid:
`servCodeId | acqPrice | nextPrice | planPrice | planDiff$ | planDiffPercent`

### `IncreaseViewControls.tsx`
Sort and group pickers. Reads from `priceIncreaseConfigSelect.viewConfig`, dispatches to `priceIncreaseConfigActions`. Sort picker shows active keys with priority numbers and `×` to remove. Group picker is single-select with "None" option.

---

## Generic Utilities (project-level)

- `src/lib/hooks/usePagination.ts` — `usePagination<T>(items, pageSize)` hook. Returns `{ page, setPage, totalPages, totalItems, pageItems }`. Page is clamped when dataset changes.
- `src/components/Paginator/Paginator.tsx` — Stateless paginator UI: `← | Page N of M (X–Y of Z) | →`.

---

## File Structure

```
src/app/priceIncrease/results/
  increaseResults.md                      ← this file
  increaseResultsTypes.ts                 ← ServiceIncreaseResult, IncreaseDataIssue, ServiceIncreaseOutcome
  makeServiceIncreaseResult.ts            ← pure function: single source of truth for service result computation
  serviceIncreaseResultsSelect.ts         ← customer bucketing + service-level results + data issues
  customerIncreaseResultsTypes.ts         ← CustomerIncreaseResult, SortableIncreaseProperties, GroupableIncreaseProperties
  customerIncreaseResultsSelect.ts        ← customer-level aggregation selector
  customerIncreaseSortFns.ts              ← sort function registry (TypeScript-enforced completeness)
  customerIncreaseGroupFns.ts             ← group function registry (TypeScript-enforced completeness)
  _lib/
    applyIncreaseView.ts                  ← pure function: applies sort + group to CustomerIncreaseResult[]
  _components/
    DataIssuesPopover.tsx                 ← layout header popover for data issue reporting
    CustomerIncreaseCard.tsx              ← customer-level display card
    ServiceIncreaseRow.tsx                ← per-service result row
    IncreaseViewControls.tsx              ← sort + group picker controls
  temp/
    page.tsx                              ← audit page at /priceIncrease/results/temp
                                            fixed header (controls + group tabs) + scrollable card list

src/app/priceIncrease/_components/
  TargetSeasonControl.tsx                 ← layout header season picker (popover with +/− arrows, localStorage-backed)

src/lib/hooks/
  usePagination.ts                        ← generic pagination hook

src/components/Paginator/
  Paginator.tsx                           ← generic stateless paginator UI
```
