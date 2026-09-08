# Price Increase Results — Data Layer

This folder contains the selector layer that computes per-customer and per-service price increase results from the active settings and customer data.

---

## Agent Context — Read This First

Before working in this folder, read **only** the files listed below. Do **not** read any file outside this list without first asking the user for explicit permission.

### Required Reading

**Module intent and settings object description**
- `src/app/priceIncrease/priceIncreasePlan.md` — read for general intent only; ignore the Required Reading list inside that file

**Existing price increase types and math**
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `SeasonIncrease`, `IncreaseFlag`, `PriceIncreaseResult`, `ServiceIncreaseBreakdown`
- `src/app/priceIncrease/_lib/priceIncreaseFuncs.ts` — pure math functions: `calcSeasonCount`, `calcPlannedIncreasePercent`, `calcUpsellAdjustment`

**Entry point (settings + season plan)**
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSelect.ts` — `settings` selector (the source of truth for active settings, draft-aware)
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts` — `activeDoc` (the active season increases plan)
- `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts` — `PriceIncreaseSettingsDoc` shape
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts` — `SeasonIncreasesDoc` shape

**Customer data shapes**
- `src/app/realGreen/customer/_lib/entities/types/CustomerTypes.ts` — `Customer` shape
- `src/app/realGreen/customer/_lib/entities/types/ProgramTypes.ts` — `Program` shape (key fields: `progCode.progCodeId`, `dateSold`, `status`)
- `src/app/realGreen/customer/_lib/entities/types/ServiceTypes.ts` — `Service` shape (key fields: `nextSize`, `nextPrice`)
- `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts` — `acquisitionPrice` getter (reads from `service.program.x.priceTable`)
- `src/app/realGreen/customer/selectors/centralSelectors.ts` — `centralSelect.customers` (fully hydrated `Customer[]`)

**Data loading — critical**
- `src/app/priceIncrease/usePriceIncreaseDeps.ts` — must call `useCustomerContext({ contexts: ["active"] })` to load customers into the active context. Without this, `centralSelect.customers` returns an empty array and all selectors produce no results.

---

## Architecture Intent

### Entry Point

`priceIncreaseConfigSelect.settings` is the single source of truth for the active `PriceIncreaseSettingsDoc`. It returns the live draft when the settings sheet is open (allowing real-time preview of config changes), otherwise falls back to the active stored settings. All selectors in this folder consume it as their settings input.

`seasonIncreasesSelect.activeDoc` provides the `SeasonIncreasesDoc` referenced by the active settings.

### Customer Bucketing

Because settings only allow a single `progCodeId`, customers fall into two buckets:

- **Matched**: has at least one program whose `progCode.progCodeId` matches `settings.progCodeId`
- **Unmatched**: no program with a matching `progCodeId`

Only matched customers participate in price increase calculations. The matched/unmatched split lives in `serviceIncreaseResultsSelect.ts` since it is a prerequisite for service-level computation.

### Pipeline Order

Settings caps (`maxIncreaseNow`, `maxIncreaseEver`) and the upsell bonus (`calcUpsellAdjustment`) are applied **after** aggregation, not at the service level. The flag (`resolveIncreaseFlag`) is resolved last, against the final adjusted customer-level percent. This order is intentional:

1. Compute raw per-service results (`ServiceIncreaseResult[]`) — no caps, no bonus
2. Aggregate to a single customer-level number
3. Apply caps and upsell bonus to the aggregated number
4. Resolve the flag against the final adjusted percent

---

## File 1: `increaseResultsTypes.ts` — Shared Types

Defines `ServiceIncreaseResult`, `IncreaseDataIssue`, and `ServiceIncreaseOutcome`.

### `ServiceIncreaseResult`

```typescript
type ServiceIncreaseResult = {
  customer: Customer;      // convenience reference — same as service.program.customer
  service: Service;        // full hydrated service — source of truth for nextPrice, servId, size, etc.
  plannedPercent: number;  // calcPlannedIncreasePercent result — compounded increase from acqPrice
  acqPrice: number;        // service.x.acquisitionPrice — theoretical price-table starting price
  planPrice: number;       // acqPrice * (1 + plannedPercent / 100)
  planDiff: number;        // planPrice - service.nextPrice (positive = increase needed)
  planDiffPercent: number; // (planDiff / service.nextPrice) * 100 — raw % increase to reach plan price
};
```

**Design notes:**
- `customer` and `service` are carried by reference for downstream convenience. Safe because this type is only used in selector output, never stored in Redux.
- `nextPrice` is not duplicated — use `service.nextPrice` directly.
- Caps, upsell bonus, and flag resolution are **not** applied here. Those belong in the customer-level aggregation layer.

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

- `dateSold` issues are **program-level**: one issue per program, no `servId`. The guard fires in the selector's program loop before iterating services.
- `acqPrice` issues are **service-level**: one issue per service, `servId` is set.

Collected by `serviceIncreaseResultsSelect.dataIssues` for display in the `DataIssuesPopover`.

### `ServiceIncreaseOutcome`

```typescript
type ServiceIncreaseOutcome =
  | { ok: true; result: ServiceIncreaseResult }
  | { ok: false; issue: IncreaseDataIssue };
```

Discriminated union returned by `makeServiceIncreaseResult`. Callers split on `ok` to route results vs. issues.

---

## File 2: `makeServiceIncreaseResult.ts` — Pure Computation Function

**Single source of truth** for how a `ServiceIncreaseOutcome` is produced from a single service.

Returns `{ ok: false, issue }` (never bare `null`) when required data is missing:
- `dateSold` empty/invalid → `missingField: "dateSold"` — this is a safety net; the primary guard is in the selector's program loop (see File 3)
- no price table → `missingField: "acqPrice"` — this is the primary per-service guard

**Inputs:**
- `service: Service`
- `dateSold: string` — from `program.dateSold`
- `currentSeason: number` — from `globalSettingsSelect.season`
- `seasonIncreases: SeasonIncrease[]` — from `seasonIncreasesSelect.activeDoc`
- `ongoingIncrease: number` — from `settings.ongoingIncrease`

---

## File 3: `serviceIncreaseResultsSelect.ts` — Customer Bucketing + Service-Level Selector

**Status: Implemented.**

**Responsibility:** Splits customers into matched/unmatched buckets, then for each matched customer's target program:
1. Guards `dateSold` at the program level — emits one `IncreaseDataIssue` and skips the program if missing
2. Iterates services and calls `makeServiceIncreaseResult` for each
3. Routes outcomes: successes → `serviceIncreaseResultMap`, failures → `dataIssues`

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

## File 4: `customerIncreaseResultsSelect.ts` — Customer-Level Aggregation

**Status: Deferred — design decisions still open.**

**Responsibility:** Aggregate each matched customer's `ServiceIncreaseResult[]` into a single `CustomerIncreaseResult`. Caps, upsell bonus, and flag resolution are applied here, after aggregation is complete.

### Open Questions

- **Aggregation method**: Size-weighted average of `planDiffPercent` (the actual gap) vs. `plannedPercent` (the theoretical compounded increase). `calcWeightedProgramIncrease` was designed for `plannedPercent`.
- **Shape of `CustomerIncreaseResult`**: May be a simple number or a richer object — depends on what the "By Customer" and "Summary" views need.
- **How to surface cap/bonus impact in the UI**: The raw aggregated number vs. the capped/bonus-adjusted number should both be available so the UI can show the effect of each setting independently.

Do not implement `customerIncreaseResultsSelect.ts` without first resolving these questions with the user.

---

## UI Components (`_components/`)

Temporary display components for the `results/temp/` page. These will evolve as the design matures.

### `DataIssuesPopover.tsx`
Renders in the `priceIncrease` layout header (left slot). Reads `serviceIncreaseResultsSelect.dataIssues`.
- No issues → grayed out, non-interactive
- Has issues → destructive border/text with count; opens a popover with an `Accordion` grouped by `missingField`
- Each accordion item shows the count and a scrollable list of messages (`max-h-48 overflow-y-auto`)

### `CustomerIncreaseCard.tsx`
Receives `ServiceIncreaseResult[]` for one customer. Displays:
- Customer header: `custId`, `displayName`, program code badges (target progCodeId highlighted in primary, others muted; keyed by `program.progId`)
- Column headers + a `ServiceIncreaseRow` per result

### `ServiceIncreaseRow.tsx`
Receives a single `ServiceIncreaseResult`. Displays a 6-column grid:
`servCodeId | acqPrice | nextPrice | planPrice | planDiff$ | planDiffPercent (plannedPercent plan)`

---

## File Structure

```
src/app/priceIncrease/results/
  increaseResults.md                  ← this file
  increaseResultsTypes.ts             ← ServiceIncreaseResult, IncreaseDataIssue, ServiceIncreaseOutcome
  makeServiceIncreaseResult.ts        ← pure function: single source of truth for service result computation
  serviceIncreaseResultsSelect.ts     ← customer bucketing + service-level results + data issues
  customerIncreaseResultsSelect.ts    ← customer-level aggregation (deferred, TBD)
  _components/
    DataIssuesPopover.tsx             ← layout header popover for data issue reporting
    CustomerIncreaseCard.tsx          ← customer-level display card
    ServiceIncreaseRow.tsx            ← per-service result row
  temp/
    page.tsx                          ← temporary debug page at /priceIncrease/results/temp
```
