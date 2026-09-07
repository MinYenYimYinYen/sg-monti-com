# Price Increase Plan

---

## Agent Context — Read This First

> **IMPORTANT FOR FUTURE AGENTS:** Before working on this module, read **only** the files listed below. Do **not** read any file outside this list without first asking the user for explicit permission.

### Required Reading

**Core Entity Types (what we're computing against)**
- `src/app/realGreen/customer/_lib/entities/types/CustomerTypes.ts`
- `src/app/realGreen/customer/_lib/entities/types/ProgramTypes.ts`
- `src/app/realGreen/customer/_lib/entities/types/ServiceTypes.ts`
- `src/app/realGreen/flag/FlagTypes.ts`
- `src/app/realGreen/custFlag/_lib/CustFlagTypes.ts`

**Pricing Infrastructure (pure math layer we extend)**
- `src/app/realGreen/priceTable/_lib/pricingFuncs.ts`
- `src/app/realGreen/priceTable/_types/PriceTableTypes.ts`

**Utils Classes (where acquisitionPrice was added)**
- `src/app/realGreen/customer/_lib/classes/ProgramUtils.ts`
- `src/app/realGreen/customer/_lib/classes/ServiceUtils.ts`
- `src/app/realGreen/customer/_lib/classes/CustomerUtils.ts`

**Selector Infrastructure (how we consume Customer data)**
- `src/app/realGreen/customer/selectors/centralSelectors.ts`

**Flag Infrastructure (for IncreaseFlag hydration)**
- `src/app/realGreen/flag/flagSlice.ts`
- `src/app/realGreen/flag/_selectors/flagSelect.ts`
- `src/app/realGreen/flag/_lib/baseFlag.ts`
- `src/app/realGreen/custFlag/_lib/custFlagSlice.ts`
- `src/app/realGreen/custFlag/_lib/custFlagSelect.ts`
- `src/app/realGreen/custFlag/_lib/useCustFlag.ts`

**Settings Pattern (singleton model — follow for GlobalSettings extension)**
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts`
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts`
- `src/app/globalSettings/_lib/globalSettingsSlice.ts`
- `src/app/globalSettings/_lib/globalSettingsSelect.ts`
- `src/app/globalSettings/_lib/useGlobalSettings.ts`
- `src/app/globalSettings/api/GlobalSettingsContract.ts`
- `src/app/globalSettings/api/route.ts`

**Multi-Document Model Pattern (follow for SeasonIncreases and PriceIncreaseSettings)**
- `src/app/bizPlan/seasonPlan/api/SeasonPlanModel.ts`

**Redux / API Patterns (how slices, thunks, and routes are built)**
- `src/store/reducers/index.ts`
- `src/store/reduxUtil/thunkFactories.ts`
- `src/lib/api/api.readme.md`
- `src/lib/mongoose/createModel.ts`
- `src/lib/mongoose/mongooseTypes.ts`

**UI Layout Pattern**
- `src/components/PageLayout/PageLayout.tsx`
- `src/components/PageLayout/TabNav.tsx`

**This Module's Own Files (once created)**
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts`
- `src/app/priceIncrease/_lib/priceIncreaseFuncs.ts`
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts`
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesModel.ts`
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSlice.ts`
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts`
- `src/app/priceIncrease/seasonIncreases/useSeasonIncreases.ts`
- `src/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract.ts`
- `src/app/priceIncrease/seasonIncreases/api/route.ts`
- `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts`
- `src/app/priceIncrease/settings/PriceIncreaseSettingsModel.ts`
- `src/app/priceIncrease/settings/settingsSlice.ts`
- `src/app/priceIncrease/settings/settingsSelect.ts`
- `src/app/priceIncrease/settings/useSettings.ts`
- `src/app/priceIncrease/settings/api/PriceIncreaseSettingsContract.ts`
- `src/app/priceIncrease/settings/api/route.ts`
- `src/app/priceIncrease/priceIncreaseSelect.ts`
- `src/app/priceIncrease/usePriceIncreaseDeps.ts`
- `src/app/priceIncrease/layout.tsx`
- `src/app/priceIncrease/page.tsx`
- `src/app/priceIncrease/config/page.tsx`
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSlice.ts`
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSelect.ts`
- `src/app/priceIncrease/config/_components/ConfigPanel.tsx`
- `src/app/priceIncrease/config/_components/SettingsSection.tsx`
- `src/app/priceIncrease/config/_components/SettingsSheet.tsx`
- `src/app/priceIncrease/config/_components/InlinePlanEditor.tsx`
- `src/app/priceIncrease/config/_components/FlagMappingsSection.tsx`
- `src/app/priceIncrease/config/_components/FlagPicker.tsx`

---

## Overview

The Price Increase module calculates how much each customer's service price should increase season over season, starting from their acquisition price. The actual price change is applied in the CRM (RealGreen); this app determines the correct increase percentage and communicates it back to the CRM by assigning a flag to the customer.

### Key Constraint

Price increases are evaluated against a single `progCodeId` configured in settings. Because of this, the customer-to-program relationship is effectively one-to-one within this module.

---

## Background: Acquisition Pricing

The `/src/app/realGreen/priceTable` module manages "acquisition pricing" — the price a service should sell for based on property size. Acquisition price is the price returned by the price table for a given service's `nextSize`. It is the theoretical starting point for all seasonal price increase calculations.

Because acquisition pricing is often discounted at the point of sale, we do not want to shock a customer by jumping to full price in their second season. Instead, we apply a gradual, configurable increase plan season over season.

---

## Season Numbering Convention

Season 1 is the season the sale was made. Season 2 is the first renewal. Price increases begin at season 2 (the first renewal), so a customer in their first season receives no increase.

The season count for a customer is:

```
seasonCount = currentSeason - year(program.dateSold)
```

A program sold in 2023, evaluated in 2026, is in season 4 — meaning 3 increases have been applied (seasons 2, 3, and 4).

---

## Data Models

### `SeasonIncreases`

A named collection of per-season increase percentages. Multiple collections can exist (e.g., "aggressive", "moderate", "conservative"). There is **no `isActive` flag** — the active plan is determined by whichever `seasonIncreasesId` the active `PriceIncreaseSettings` references.

Follows the multi-document model pattern from `SeasonPlanModel.ts` — uses `createModel()` with a Mongoose schema.

**Fields:**
- `seasonIncreasesId: string` — UUID, auto-generated by the client on creation
- `label: string` — human-readable name
- `seasonIncreases: SeasonIncrease[]` — ordered array starting at season 2

**`SeasonIncrease` shape:**
```typescript
type SeasonIncrease = {
  season: number;          // 2, 3, 4, ... (season 1 = sale season, no increase)
  increasePercent: number;
};
```

Season numbers are always derived from array position (`index + 2`) — the `season` field is recomputed on save. The UI only edits `increasePercent` per row.

The UI displays a running total of cumulative compounded increase as seasons are added.

---

### `PriceIncreaseSettings`

The active configuration for a price increase run. Multiple settings documents can exist; only one is active at a time, enforced at the API level.

Follows the multi-document model pattern from `SeasonPlanModel.ts` — uses `createModel()` with a Mongoose schema.

**Fields:**
- `settingsId: string` — UUID, auto-generated by the client on creation
- `label: string` — human-readable name
- `isActive: boolean` — only one may be active at a time
- `seasonIncreasesId: string` — references the `SeasonIncreases` collection to use
- `progCodeId: string` — the program code evaluated for price increase
- `maxIncreaseNow: number` — maximum increase percentage to apply in the current run
- `maxIncreaseEver: number` — maximum cumulative increase percentage ever applied
- `ongoingIncrease: number` — percentage applied each season after all `SeasonIncreases` seasons are exhausted
- `upsellBonusThreshold: number` — number of other programs a customer must have before the upsell bonus applies
- `upsellBonusPercent: number` — for each program beyond the threshold, reduce the planned increase by this percentage (floored at `minPriceIncrease`)
- `minPriceIncrease: number` — minimum increase percentage (floor for all reductions)
- `manualAttentionThreshold: number` — flag for manual review when the calculated increase exceeds `maxIncreaseNow` by this percentage
- `flagRounding: "round" | "ceil" | "floor"` — how to resolve the gap between a calculated percentage and the nearest available `IncreaseFlag`

**Note:** `exemptFlagId` and `manualFlagId` are **not** on `PriceIncreaseSettings`. They live on `GlobalSettings` as `priceIncreaseExemptFlagId` and `priceIncreaseManualFlagId`.

---

### `IncreaseFlag` Mappings (stored in `GlobalSettings`)

Maps a RealGreen flag to a price increase percentage. These mappings bridge the gap between a calculated increase percentage and what can actually be communicated to the CRM via a flag.

Stored as properties of `GlobalSettings` (not a standalone collection):

```typescript
type IncreaseFlagMapping = {
  flagId: number;
  increasePercent: number;
};

// Added to GlobalSettings:
increaseFlagMappings: IncreaseFlagMapping[];          // default: []
priceIncreaseExemptFlagId: number | null;             // default: null
priceIncreaseManualFlagId: number | null;             // default: null
```

**UI constraint:** `increasePercent` values must be unique across all `IncreaseFlagMapping` entries. Duplicate percentages are rejected client-side before saving.

**Hydrated type (`IncreaseFlag`):** Produced in the selector layer by joining each `IncreaseFlagMapping` with `flagSelect.flagDocMap`. Spreads all properties of the existing `Flag` type and adds `increasePercent`.

```typescript
type IncreaseFlagProps = Flag;
type IncreaseFlag = IncreaseFlagMapping & IncreaseFlagProps;
```

The `IncreaseFlag` type is defined in `PriceIncreaseTypes.ts`. Hydration happens in `priceIncreaseSelect.ts` using `globalSettingsSelect.increaseFlagMappings` and `flagSelect.flagDocMap`.

The exempt and manual flag IDs are read from `globalSettingsSelect.priceIncreaseExemptFlagId` and `globalSettingsSelect.priceIncreaseManualFlagId` in `priceIncreaseSelect.ts`.

---

## Pure Math Layer (`priceIncreaseFuncs.ts`)

All price increase calculations live in a single pure-functions file, following the same pattern as `src/app/realGreen/priceTable/_lib/pricingFuncs.ts`. Functions take primitive inputs and return primitive outputs. They have no knowledge of Redux, React, or MongoDB.

**Functions:**

```typescript
calcSeasonCount({ dateSold: string, currentSeason: number }): number
calcPlannedIncreasePercent({ seasonCount, seasonIncreases, ongoingIncrease }): number
calcUpsellAdjustment({ plannedPercent, otherProgramCount, threshold, bonusPercent, minPercent }): number
calcWeightedProgramIncrease({ services: { size, plannedPercent }[] }): number
applyIncreaseCaps({ percent, maxNow, maxEver, cumulativeIncreaseToDate }): number
resolveIncreaseFlag({ calculatedPercent, increaseFlags, rounding }): IncreaseFlag | null
```

---

## `ServiceUtils.acquisitionPrice`

A getter on `ServiceUtils` that returns the price table price for the service's `nextSize`. This is the theoretical acquisition price — the starting point for all seasonal increase calculations.

```typescript
get acquisitionPrice(): number | null {
  const priceTable = this.service.program.x.priceTable;
  if (!priceTable) return null;
  return getPriceChartPrice({ size: this.service.nextSize, priceTable });
}
```

---

## Selector Architecture

Price increase results are **not** added to `CustomerProps`. Instead, a standalone selector `priceIncreaseSelect.results` produces a `Map<custId, PriceIncreaseResult>` by consuming `centralSelect.customers` and the active configuration.

### `seasonIncreasesSelect.activeDoc`

The active season plan is derived by matching `priceIncreaseSettingsSelect.activeDoc.seasonIncreasesId` against `seasonIncreasesSelect.docs`. There is no `isActive` flag on `SeasonIncreasesDoc`.

### `PriceIncreaseResult`

```typescript
type PriceIncreaseResult = {
  custId: number;
  progId: number;
  calculatedPercent: number;    // before flag rounding
  cappedPercent: number;        // after maxIncreaseNow / maxIncreaseEver caps
  resolvedFlag: IncreaseFlag | null;
  isExempt: boolean;
  isManual: boolean;
  needsManualAttention: boolean;
  serviceBreakdown: {
    servId: number;
    size: number;
    acquisitionPrice: number;
    nextPrice: number;
    plannedPercent: number;
  }[];
};
```

### `priceIncreaseSelect`

```typescript
priceIncreaseSelect.results: Map<custId, PriceIncreaseResult>
priceIncreaseSelect.resultsArray: PriceIncreaseResult[]
priceIncreaseSelect.withUpsellBonus: PriceIncreaseResult[]
priceIncreaseSelect.sortedByIncrease: PriceIncreaseResult[]
priceIncreaseSelect.flagResolutionError: number
priceIncreaseSelect.increaseFlags: IncreaseFlag[]
```

---

## Flag Resolution and the CRM Bridge

Adding a flag to a customer is the only write-back to the CRM. The user then applies price increases in RealGreen based on which flag a customer has.

**Weighted average algorithm:** The program-level increase is the size-weighted average of all service-level increases.

**Flag rounding:** When the calculated percentage falls between two available `IncreaseFlag` values, the `flagRounding` setting determines which flag is assigned:
- `"round"` — nearest flag
- `"ceil"` — next higher flag
- `"floor"` — next lower flag

---

## Reporting Views

- **Config** — manage `PriceIncreaseSettings`, `SeasonIncreases` plans (inline within settings sheet), and `IncreaseFlag` mappings (via GlobalSettings)
- **Summary** — total revenue increase, aggregate statistics
- **By Customer** — sortable/filterable customer list with increase amounts

---

## File Structure

```
src/app/priceIncrease/
  _lib/
    PriceIncreaseTypes.ts         ← SeasonIncrease, IncreaseFlagMapping, IncreaseFlag, PriceIncreaseResult
    priceIncreaseFuncs.ts         ← pure math functions
  seasonIncreases/
    SeasonIncreasesTypes.ts       ← SeasonIncreasesDoc (no isActive field)
    SeasonIncreasesModel.ts       ← createModel() pattern (multi-document)
    seasonIncreasesSlice.ts       ← getAll, upsert, remove (no setActive)
    seasonIncreasesSelect.ts      ← activeDoc derived from settings.seasonIncreasesId
    useSeasonIncreases.ts
    api/
      SeasonIncreasesContract.ts  ← getAll, upsert, remove (no setActive)
      route.ts
  settings/
    PriceIncreaseSettingsTypes.ts ← no exemptFlagId/manualFlagId
    PriceIncreaseSettingsModel.ts ← createModel() pattern (multi-document)
    settingsSlice.ts
    settingsSelect.ts
    useSettings.ts
    api/
      PriceIncreaseSettingsContract.ts
      route.ts
  priceIncreaseSelect.ts          ← reads exempt/manual from globalSettingsSelect
  usePriceIncreaseDeps.ts         ← includes useProgServ({ autoLoad: true })
  layout.tsx                      ← PageLayout + TabNav
  page.tsx                        ← redirect to /priceIncrease/config
  config/
    page.tsx
    _lib/
      priceIncreaseConfigSlice.ts ← all config UI state
      priceIncreaseConfigSelect.ts
    _components/
      ConfigPanel.tsx
      SettingsSection.tsx
      SettingsSheet.tsx           ← embeds InlinePlanEditor
      InlinePlanEditor.tsx        ← inline season plan CRUD
      FlagMappingsSection.tsx     ← FlagPicker + exempt/manual dropdowns
      FlagPicker.tsx
  summary/
    page.tsx
  byCustomer/
    page.tsx
```

**Notes:**
- There is no standalone `increaseFlag/` module. Flag-to-percent mappings are stored in `GlobalSettings.increaseFlagMappings` and hydrated in `priceIncreaseSelect.ts`.
- Season plans have no `isActive` flag. The active plan is determined by `PriceIncreaseSettings.seasonIncreasesId`.
- Both `settingsId` and `seasonIncreasesId` are UUIDs generated client-side via `crypto.randomUUID()` — users only enter a label.
- Season plan CRUD is embedded inline within the Settings Sheet (`InlinePlanEditor`), not as a separate config section.
