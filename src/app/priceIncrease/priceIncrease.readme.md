# Price Increase Module

## Overview

The Price Increase module decides how much each customer's price for one program should rise this season, then communicates that decision to RealGreen (SA5) by **assigning a flag** to the customer. The flag is the only write-back; the actual price change is applied inside the CRM by someone acting on the flag.

The calculation starts from the service's **acquisition price** (the price-table price for its size, econ/pref-aware), compounds a configurable per-season increase plan to get a **plan price**, then measures how far the customer's **current price** (`service.nextPrice`) is from that plan price. That gap, aggregated to the customer, adjusted and capped, is resolved to the nearest configured increase flag.

Everything is evaluated against a single `progCodeId` chosen in settings, so within this module a customer has exactly one **target program**. Customers without that program are "unmatched" and ignored.

This document is the single reference for the module. The original planning documents were consolidated here; where the plans and the implementation disagreed, the implementation is described.

---

## File Structure

```
src/app/priceIncrease/
  priceIncrease.readme.md             <- this document
  layout.tsx                          <- PageLayout + TabNav; calls usePriceIncreaseDeps(); header controls; settings panel
  page.tsx                            <- redirect to /priceIncrease/config
  usePriceIncreaseDeps.ts             <- every data dependency the module needs (called once, in layout)
  usePriceIncreaseCustFlags.ts        <- loads custFlag data for every flagId the module cares about
  _components/
    TargetSeasonControl.tsx           <- header season picker (localStorage-backed override)
  _lib/
    PriceIncreaseTypes.ts             <- SeasonIncrease, IncreaseFlagMapping, IncreaseFlag
    priceIncreaseFuncs.ts             <- pure math: calcSeasonCount, calcPlannedIncreasePercent,
                                         calcUpsellAdjustment, applyIncreaseCaps, resolveIncreaseFlag
  seasonIncreases/                    <- data module: named per-season increase plans
    SeasonIncreasesTypes.ts, SeasonIncreasesModel.ts, seasonIncreasesSlice.ts,
    seasonIncreasesSelect.ts, useSeasonIncreases.ts, api/SeasonIncreasesContract.ts, api/route.ts
  settings/                           <- data module: PriceIncreaseSettings (one active)
    PriceIncreaseSettingsTypes.ts, PriceIncreaseSettingsModel.ts, settingsSlice.ts,
    settingsSelect.ts, useSettings.ts, api/PriceIncreaseSettingsContract.ts, api/route.ts
  config/                             <- Config tab
    page.tsx
    _lib/priceIncreaseConfigSlice.ts  <- ALL transient UI state for the module (drafts, view config, season override, panel)
    _lib/priceIncreaseConfigSelect.ts <- settings (draft-aware), targetSeason, draft/validation selectors
    _components/
      ConfigPanel.tsx, SettingsSection.tsx, SettingsSheet.tsx, InlinePlanEditor.tsx,
      FlagMappingsSection.tsx, FlagPicker.tsx
  results/                            <- the computation pipeline + shared result UI
    increaseResultsTypes.ts           <- ServiceIncreaseResult, IncreaseDataIssue, ServiceIncreaseOutcome
    makeServiceIncreaseResult.ts      <- pure per-service computation
    serviceIncreaseResultsSelect.ts   <- customer bucketing, per-service results, data issues
    customerIncreaseResultsTypes.ts   <- CustomerIncreaseResult, Sortable/Groupable props, PreExistingFlagStatus,
                                         getAssignFlagBlockReason
    customerIncreaseResultsSelect.ts  <- customer-level aggregation (the main results selector)
    customerIncreaseSortFns.ts        <- sort registry (compile-time complete)
    customerIncreaseGroupFns.ts       <- group registry (compile-time complete) + season bucketing
    _lib/applyIncreaseView.ts         <- pure sort + group application
    _components/
      CustomerIncreaseCard.tsx, ServiceIncreaseRow.tsx, IncreaseViewControls.tsx,
      DataIssuesPopover.tsx, ActiveSettingsPanel.tsx, AssignFlagButton.tsx, AssignAllButton.tsx
  summary/                            <- Summary tab
    page.tsx
    priceIncreaseSummarySelect.ts     <- revenue snapshots, flag perspectives, group summaries
  byCustomer/
    page.tsx                          <- By Customer tab (cards, sort/group, pagination, Assign All)
```

Redux keys registered in `src/store/reducers/index.ts`: `seasonIncreases`, `priceIncreaseSettings`, `priceIncreaseConfig`.

Outside this folder, the module depends on three `GlobalSettings` fields (`increaseFlagMappings`, `priceIncreaseExemptFlagIds`, `priceIncreaseManualFlagId`), on `ServiceUtils.acquisitionPrice`, and on the `custFlag` module for flag reads/writes (see section 7).

---

## 1. Using the Module

**Required Reading:** none. This section is self-contained and describes behavior, not code.

### 1.1 One-time setup (Config tab)

Work bottom-up on the Config page; settings depend on flags existing first.

1. **Increase Flag Mappings.** Pick each RealGreen flag that represents an increase percentage (e.g. "PI 3", "PI 5", "PI 8") and type its integer percent. Percentages must be unique; a `0` percent is valid and has a special meaning (see 1.4). Click **Save Changes** (the button is highlighted while there are unsaved edits).
2. **Exempt Flags / Manual Flag.** Under the picker: a multi-select popover of checkboxes for exempt flags (a customer with any of them is exempt) and a single dropdown for the manual flag. These save immediately on change.
   - *Exempt*: customer is never assigned a flag. They still appear in results so the opportunity cost is visible.
   - *Manual*: someone has already set the price in RealGreen. These customers are currently **hidden from results entirely** (see 1.6 and section 4.5).
3. **Season Increase Plan.** Created inside the settings sheet: click **New** in Price Increase Settings, then the **+** next to "Increase Plan". Give it a label and add seasons. Season 2 is the first renewal (season 1 is the sale year, never increased). The cumulative column shows the compounded total. Season numbers are derived from row position; you only edit percentages.
4. **Price Increase Settings.** Fill the rest of the sheet: program code, caps, ongoing increase, upsell bonus, manual-attention threshold, flag rounding. Save, then click **Set Active** on the card. Exactly one settings record is active at a time; the old ones stay in the list as a record.

### 1.2 Target season

The header shows the season being planned. It defaults to `globalSettings.season`. Use the +/- control to plan for a different year (e.g. production is still 2026 but you are planning 2027). The override persists in `localStorage` for six months and affects every season-count calculation in the module without touching stored settings.

### 1.3 Reading a customer card (By Customer tab)

Header row: customer link, exempt/manual badges (red), pre-existing increase flag badges (blue; red border = override, red border + strikethrough = conflict), size, **Review** badge when manual attention is needed, customer renewal revenue, then the formula strip:

```
Raw  ->  [- Bonus  ->  Adjusted]  ->  [Capped]  ->  Flag  ->  [Override | Conflict]
```

- **Raw** - size-weighted gap between current price and plan price.
- **Bonus / Adjusted** - shown only when the upsell bonus actually reduced the number.
- **Capped** - shown only when `maxIncreaseNow` / `maxIncreaseEver` clipped it.
- **Flag** - the flag the module resolved.
- **Override / Conflict** - what will actually happen if a pre-existing flag changes the outcome.

Each card has a refresh icon (re-fetches the customer from RealGreen and reconciles its flags) and a flag icon (assign this customer's resolved flag; disabled with a tooltip explaining why when assignment is blocked).

Below the header: renewal flags, program metadata (Econ/Pref, sold date, season count, program revenue), then one row per service: `code | size | acq price | next price | plan price | diff $ | diff %`.

### 1.4 Flag resolution rules worth knowing

- Resolution runs against the **calculated** (post-bonus, pre-cap) percent.
- `round` = nearest flag, `ceil` = next flag at or above, `floor` = next flag at or below. If the percent is outside the range of configured flags, ceil/floor fall back to the highest/lowest flag rather than returning nothing.
- If the percent is **zero or negative** (customer already at or above plan price), only a flag mapped to exactly **0%** will be assigned. If no 0% flag is mapped, the customer gets **No Flag**. Mapping a 0% flag is how you make "no increase" an explicit CRM state.

### 1.5 Summary tab

- **Grand Total** - current vs projected renewal revenue for non-exempt customers, using each customer's *effective* flag. Projected per-service prices are rounded to the nearest nickel to mirror the CRM.
- **Exempt opportunity** - what exempt customers would contribute if not exempt (uses their capped percent).
- **Status counts** - conflicts, needs review, below acquisition, overpriced, no flag, and a breakdown by pre-existing flag status.
- **Flag perspective** toggle:
  - *Effective* - the flag each customer will end up with (pre-existing wins over resolved).
  - *Actual* - what is in the CRM right now.
  - *Queued* - what **Assign All** would write right now (customers with no pre-existing flag only).
- **Group by** - any group key (season, exempt, below acquisition, ...) with revenue per group. Exempt customers are included here using their capped percent so cohort totals show what is being left on the table.

### 1.6 Assigning flags

- **Individual**: the flag icon on a card. Blocked (with reason) when the customer is exempt, manual, has conflicting flags, already has the matching flag, has a different pre-existing flag (override), or has no resolved flag.
- **Assign All** (By Customer header): disabled if **any** customer in results is in conflict, or if nobody is eligible. Opens a dialog with a pre-flight summary (to assign / already correct / override skipped / exempt skipped), then requires the user to **re-enter their password** before writing. Writes are grouped by flag (one API call per flag). A success screen reports counts.
- **Conflicts** (two increase flags on one customer, or an increase flag together with the exempt or manual flag) must be fixed in RealGreen. Afterward, click the card's refresh icon; the module reconciles flags automatically.
- **Override** (one pre-existing increase flag that differs from the resolved flag) is never overwritten by the module. The pre-existing flag is treated as the effective outcome. To change it, fix it in RealGreen.

### 1.7 Known limitations

| Limitation | Effect |
|---|---|
| `cumulativeIncreaseToDate` is hard-coded to `0` | `maxIncreaseEver` behaves as a second absolute cap, not a lifetime cap. Tracking prior increases natively is future work. |
| No flag swap | Override customers are skipped, not re-flagged. Removing the old flag and adding the new one must be done in RealGreen. |
| Manual customers hidden | They are excluded before computation, so they are absent from counts, revenue, and the conflict check. See section 4.5 for the planned change. |
| Manual-inclusion confirmation never built | The plan's "confirm to include manual customers in Assign All" dialog does not exist. |

---

## 2. Data Models and Config Persistence

**Required Reading:**
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts`
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts`
- `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts`
- `src/app/priceIncrease/settings/api/route.ts` (for `setActive` semantics)
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` (only the `increaseFlagMappings` / `priceIncrease*` fields)

Three persisted shapes feed the module. Two are their own collections; the third lives on `GlobalSettings`.

### 2.1 `SeasonIncreasesDoc` (collection `SeasonIncreases`)

```typescript
type SeasonIncrease = { season: number; increasePercent: number }; // season >= 2
type SeasonIncreasesDoc = CreatedUpdated & {
  seasonIncreasesId: string;        // UUID generated client-side (crypto.randomUUID())
  label: string;
  seasonIncreases: SeasonIncrease[];
};
```

- No `isActive` field. The active plan is whichever doc the active settings reference by `seasonIncreasesId` (`seasonIncreasesSelect.activeDoc`).
- `season` is always `index + 2` and is recomputed by `InlinePlanEditor` on save; the UI never lets the user edit it.
- API ops: `getAll`, `upsert`, `remove`. Roles: read `admin|office`, write `admin`.

### 2.2 `PriceIncreaseSettingsDoc` (collection `PriceIncreaseSettings`)

```typescript
type FlagRounding = "round" | "ceil" | "floor";
type PriceIncreaseSettingsDoc = CreatedUpdated & {
  settingsId: string;               // UUID generated client-side
  label: string;
  isActive: boolean;                // exactly one true; enforced by the setActive handler
  seasonIncreasesId: string;        // FK to SeasonIncreasesDoc
  progCodeId: string;               // the single target program
  maxIncreaseNow: number;           // cap on this run's percent
  maxIncreaseEver: number;          // cap on lifetime percent (currently behaves as absolute; see 1.7)
  ongoingIncrease: number;          // percent per season after the plan's last defined season
  upsellBonusThreshold: number;     // other active programs required before the bonus starts
  upsellBonusPercent: number;       // reduction per program beyond the threshold
  minPriceIncrease: number;         // floor for the bonus reduction
  manualAttentionThreshold: number; // review when rawPercent > maxIncreaseNow + this
  flagRounding: FlagRounding;
};
```

- API ops: `getAll`, `upsert`, `setActive` (deactivates all, activates one), `remove`.
- The slice state key is `storedSettings`; selectors are `priceIncreaseSettingsSelect.storedSettings` and `.activeSettings`. These expose **persisted** state only. UI and results must read `priceIncreaseConfigSelect.settings` instead (section 4.1).

### 2.3 `GlobalSettings` fields

```typescript
type IncreaseFlagMapping = { flagId: number; increasePercent: number };
type IncreaseFlag = IncreaseFlagMapping & Flag;   // hydrated in selectors via flagSelect.flagDocMap

// on GlobalSettings
increaseFlagMappings: IncreaseFlagMapping[];      // default []
priceIncreaseExemptFlagIdss: number[];             // default []
priceIncreaseManualFlagId: number | null;         // default null
```

- Saved through the existing `globalSettingsActions.updateSettings` (accepts `Partial<GlobalSettings>`); no dedicated route.
- Client-side validation before save: at least one mapping, every `increasePercent >= 0`, no duplicate percents. `0` is deliberately allowed (section 1.4).
- Hydration to `IncreaseFlag[]` happens in `customerIncreaseResultsSelect.ts` (`selectIncreaseFlags`) and, for the config draft, in `priceIncreaseConfigSelect.flagMappingsDraftHydrated`. A mapping whose `flagId` is not in `flagDocMap` is silently dropped.

---

## 3. The Math (pure layer)

**Required Reading:**
- `src/app/priceIncrease/_lib/priceIncreaseFuncs.ts`
- `src/app/priceIncrease/results/makeServiceIncreaseResult.ts`

Pure functions, primitive in / primitive out, no Redux or React. Object parameters throughout.

### 3.1 Season numbering

```
seasonCount = targetSeason - year(program.dateSold) + 1
```

Season 1 is the sale season and receives no increase. A program sold in 2023 evaluated for 2026 is in season 4, meaning increases for seasons 2, 3 and 4 are compounded.

### 3.2 Function reference

| Function | Output | Notes |
|---|---|---|
| `calcSeasonCount({ dateSold, currentSeason })` | `number` | Formula above. Callers pass `priceIncreaseConfigSelect.targetSeason` as `currentSeason`. |
| `calcPlannedIncreasePercent({ seasonCount, seasonIncreases, ongoingIncrease })` | cumulative compounded % | Returns `0` for `seasonCount <= 1`. For seasons 2..N uses the plan entry if present, else `ongoingIncrease`. Compounded, not summed: 5% then 3% = 8.15%. |
| `calcUpsellAdjustment({ plannedPercent, otherProgramCount, threshold, bonusPercent, minPercent })` | adjusted % | `max(minPercent, planned - bonusPercent * max(0, other - threshold))`. `minPercent` is a floor on the *result*, so it can raise a negative or small percent up to `minPriceIncrease`. |
| `applyIncreaseCaps({ percent, maxNow, maxEver, cumulativeIncreaseToDate })` | capped % | `max(0, min(percent, maxNow, maxEver - cumulative))`. Floors at `0`, so negative inputs become `0`. |
| `resolveIncreaseFlag({ calculatedPercent, increaseFlags, rounding })` | `IncreaseFlag \| null` | `<= 0`: only an exact 0% flag matches, else `null`. Otherwise round/ceil/floor; ceil/floor fall back to the extreme flag when out of range. |

### 3.3 Per-service computation (`makeServiceIncreaseResult`)

Returns a `ServiceIncreaseOutcome` discriminated union rather than throwing or returning `null`, so missing data can be reported:

```
acqPrice        = service.x.acquisitionPrice               (null -> { ok: false, issue: "acqPrice" })
plannedPercent  = calcPlannedIncreasePercent(...)
planPrice       = acqPrice * (1 + plannedPercent / 100)
planDiff        = planPrice - service.nextPrice
planDiffPercent = planDiff / service.nextPrice * 100        (0 when nextPrice is 0)
```

This is the conceptual pivot of the module: the increase is measured **relative to the customer's current price**, not to the acquisition price. A customer already paying above plan gets a negative `planDiffPercent`. Caps, bonus and flag resolution are deliberately *not* applied here.

`ServiceUtils.acquisitionPrice` reads `service.program.x.priceTable`, which already routes to the economy table when `ProgramUtils.isEcon` is true. No econ/pref logic is needed in this module.

---

## 4. Results Pipeline (selectors)

**Required Reading:**
- `src/app/priceIncrease/results/serviceIncreaseResultsSelect.ts`
- `src/app/priceIncrease/results/customerIncreaseResultsSelect.ts`
- `src/app/priceIncrease/results/increaseResultsTypes.ts`
- `src/app/priceIncrease/results/customerIncreaseResultsTypes.ts`
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSelect.ts` (only `settings` and `targetSeason`)
- `src/app/priceIncrease/usePriceIncreaseDeps.ts`

### 4.1 Entry points

| Input | Selector | Rule |
|---|---|---|
| Settings | `priceIncreaseConfigSelect.settings` | Returns the live **draft** when one exists, else the active stored settings. This is what makes results update in real time while editing. Never read `priceIncreaseSettingsSelect.activeSettings` from results code. |
| Season plan | `seasonIncreasesSelect.activeDoc` | Joined from the active *stored* settings' `seasonIncreasesId`. Draft changes to the plan selection are not reflected until saved. |
| Season | `priceIncreaseConfigSelect.targetSeason` | Override from localStorage, else `globalSettings.season`. **Never use `globalSettingsSelect.season` in this module.** |
| Flags | `selectIncreaseFlags` (in `customerIncreaseResultsSelect.ts`), `globalSettingsSelect.priceIncreaseExemptFlagIds`, `globalSettingsSelect.priceIncreaseManualFlagId` | |
| Customers | `centralSelect.customers` | Fully hydrated `Customer[]` from the active context. |

### 4.2 Stage 1 - `serviceIncreaseResultsSelect`

1. **Bucketing**: each customer is `matched` (has a program with `progCode.progCodeId === settings.progCodeId`) or `unmatched`. Only matched customers continue. Exported as `matchedCustomers` / `unmatchedCustomers`.
2. **Program guard**: a missing `dateSold` emits one `IncreaseDataIssue` for the whole program and skips it.
3. **Service loop**: `makeServiceIncreaseResult` per service. Successes go to `byCustomer: Map<custId, ServiceIncreaseResult[]>`; failures go to `dataIssues`.
4. Customers with zero successful services are absent from `byCustomer`.

`dataIssues` is surfaced in the layout header by `DataIssuesPopover` so the user knows why customers are missing.

### 4.3 Stage 2 - `customerIncreaseResultsSelect.results`

For each matched customer with service results, in this order:

1. `isExempt` / `isManual` from `customer.flags`. **Manual customers are skipped here** (`continue`).
2. `rawPercent` = size-weighted (by `service.nextSize`) average of `planDiffPercent`.
3. `calculatedPercent` = `calcUpsellAdjustment(rawPercent, otherProgramCount, ...)`, where `otherProgramCount` counts other programs with `status === "9"`.
4. `cappedPercent` = `applyIncreaseCaps(calculatedPercent, ..., cumulativeIncreaseToDate: 0)`.
5. `resolvedFlag` = `resolveIncreaseFlag(calculatedPercent, ...)`; forced `null` for exempt customers.
6. `preExistingIncreaseFlags` = the customer's flags that are also mapped increase flags.
7. `effectiveFlag` and `preExistingFlagStatus` per the table in 4.4.
8. `needsManualAttention` = `!isExempt && rawPercent > maxIncreaseNow + manualAttentionThreshold`. Evaluated on **raw**, because after capping nothing could ever exceed the threshold.
9. `sortable` / `groupable` sub-objects are pre-computed (section 5).

Exempt customers run the whole pipeline so their service breakdown and hypothetical percent are available for the opportunity-cost views; only their flags are forced to `null`.

### 4.4 Pre-existing flag truth table

| Pre-existing increase flags | Exempt? | `preExistingFlagStatus` | `effectiveFlag` |
|---|---|---|---|
| 0 | no | `none` | `resolvedFlag` |
| 1, same as `resolvedFlag` | no | `matching` | that flag |
| 1, differs | no | `override` | the pre-existing flag |
| 2+ | any | `conflict` | `null` |
| 1+ | yes | `conflict` | `null` |
| 0 | yes | `none` | `null` |

The code also treats "1+ increase flags AND manual" as conflict, but manual customers never reach this point today.

Derived groupable flags: `hasIncreaseFlag`, `isOverpriced` (`rawPercent < 0`), `isBelowAcquisition` (any `nextPrice < acqPrice`), `resolvedFlagDesc` (effective flag desc, `"Exempt"`, or `"No Flag"`), `seasonCountBucket`.

### 4.5 Manual customers - current behavior and planned change

**Current:** `customerIncreaseResultsSelect` drops manual customers before any computation. As a result the following code paths exist but are unreachable: the `isManual` group key, the manual branch of `getAssignFlagBlockReason`, the manual badge on `CustomerIncreaseCard`, and the manual half of the conflict rule.

**Planned (not yet implemented):** treat manual customers the way exempt customers are treated today.

1. In `customerIncreaseResultsSelect.ts`, remove the `if (isManual) continue;` guard. Keep `isManual` on `groupable`. Force `resolvedFlag` and `effectiveFlag` to `null` when `isManual`, exactly as for `isExempt`, and exclude them from `needsManualAttention`.
2. In `AssignAllButton.analyzeResults`, skip `isManual` results before the status checks and report a `manualCount` in the pre-flight summary alongside `exemptCount`.
3. In `priceIncreaseSummarySelect`, decide whether manual customers join `exemptOpportunity` or get their own `manualOpportunity` snapshot; add `manualCount` to the status counts.
4. The `increase flag + manual flag -> conflict` rule then becomes live with no further changes, which is the main safety benefit.
5. Optional follow-up from the original plan: a confirmation step in the Assign All dialog to include manual customers, and an explicit-confirm path on `AssignFlagButton`.

Until then, user-facing behavior is "manual customers are hidden".

### 4.6 Data loading contract (`usePriceIncreaseDeps`)

Called once in `layout.tsx`. Each hook is load-bearing:

| Hook | Without it |
|---|---|
| `useCustomerContext({ contexts: ["active"] })` + `useActiveCustomers({ autoLoad: true })` | `centralSelect.customers` is empty; no results at all. |
| `useGlobalSettings({ autoLoad: true })` | No flag mappings, no exempt/manual IDs, no season. |
| `useProgServ({ autoLoad: true })` | Program dropdown in settings is empty; `progCode` hydration fails. |
| `useSeasonIncreases()` / `usePriceIncreaseSettings()` | No plan / no settings. |
| `usePriceTable({ autoLoad: true })` | `acquisitionPrice` is `null` for every service; every customer becomes a data issue. |
| `usePriceIncreaseCustFlags()` | `customer.flags` lacks the PI flags; `isExempt`, `isManual`, `hasIncreaseFlag` and all pre-existing-flag logic silently report false/none. |

---

## 5. Sort / Group / View

**Required Reading:**
- `src/app/priceIncrease/results/customerIncreaseSortFns.ts`
- `src/app/priceIncrease/results/customerIncreaseGroupFns.ts`
- `src/app/priceIncrease/results/_lib/applyIncreaseView.ts`
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSlice.ts` (the `viewConfig` section only)

### 5.1 Registry pattern

`CustomerIncreaseResult` carries two pre-computed sub-objects:

```typescript
sortable: SortableIncreaseProperties;   // increaseDollar, increasePercent, rawPercent, customerRevenue, programRevenue, seasonCount
groupable: GroupableIncreaseProperties; // isExempt, isManual, needsManualAttention, hasIncreaseFlag, isOverpriced,
                                        // isBelowAcquisition, resolvedFlagDesc, preExistingFlagStatus, seasonCountBucket
```

The registries are typed `Record<keyof SortableIncreaseProperties, SortFn>` and `Record<keyof GroupableIncreaseProperties, GroupFn>` (plus matching `...Labels` records), so adding a property to the type without adding a registry entry is a compile error. Sort functions always return a **descending** comparator; `applySortDirection(cmp, direction)` negates for `"asc"`.

`sortable.increasePercent` is the *effective* flag's percent when one exists (falls back to `cappedPercent`), so sorting reflects the real outcome.

### 5.2 View config

```typescript
type IncreaseViewConfig = {
  sortKeys: SortEntry[];                     // ordered; primary first; each { key, direction }
  groupKey: CustomerIncreaseGroupKey | null;
  activeGroup: string | null;                // selected group tab label
};
```

Lives in `priceIncreaseConfigSlice.viewConfig` so it survives tab navigation. Actions: `setViewSortKeys`, `addViewSortKey`, `removeViewSortKey`, `toggleViewSortDirection`, `setViewGroupKey`, `setViewActiveGroup`, `resetViewConfig`. Changing sort or group resets `activeGroup`.

`applyIncreaseView(results, viewConfig)` is the only place sort+group are applied. It returns `{ grouped: false, results }` or `{ grouped: true, groups, activeGroup, activeResults }`, defaulting `activeGroup` to the first group when the stored value is null or stale.

`getSeasonCountBucket(seasonCount, configSeasonCount)` gives individual labels up to the number of seasons defined in the plan (+1), then 5-season ranges.

To capture a view worth making a preset: configure it in the UI, then `console.log(store.getState().priceIncreaseConfig.viewConfig)`.

---

## 6. Summary

**Required Reading:**
- `src/app/priceIncrease/summary/priceIncreaseSummarySelect.ts`
- `src/app/priceIncrease/summary/page.tsx`

`priceIncreaseSummarySelect.summary` consumes `customerIncreaseResultsSelect.results`, `priceIncreaseConfigSelect.summaryGroupKey` and `.summaryFlagPerspective`, and returns one `PriceIncreaseSummary` object.

- **`RevenueSnapshot`** = `{ currentRevenue, projectedRevenue, revenueDelta, revenueDeltaPercent }`. Current = sum of `service.nextPrice`; projected = sum of `roundToNickel(nextPrice * (1 + pct/100))` per service. A `null` percent means "no change".
- **`grand`** - non-exempt customers, using `effectiveFlag.increasePercent`.
- **`exemptOpportunity`** - exempt customers, using `cappedPercent`.
- **Status counts** - `exemptCount`, `conflictCount`, `needsManualAttentionCount`, `belowAcquisitionCount`, `overpricedCount`, `noFlagCount`, `flagStatusCounts: Record<PreExistingFlagStatus, number>`.
- **Three perspectives** (`FlagGroupSummary[]`, non-exempt only, always computed): `byEffectiveFlag`, `byActualFlag` (`preExistingIncreaseFlags[0]`, with `"Conflict"` / `"Unassigned"` buckets), `byQueuedFlag` (only `preExistingFlagStatus === "none"`, grouped by `resolvedFlag`). `activePerspective` picks one via `summaryFlagPerspective: "effective" | "actual" | "queued"`.
- **`groupSummaries`** - when `summaryGroupKey` is set, a `GroupSummary[]` built with `groupCustomerIncreaseResults`; includes exempt customers using `cappedPercent`.

The page is presentational: `GrandTotalCard`, perspective toggle, flag group table, group-by picker and table. Summary UI state (`summaryGroupKey`, `summaryFlagPerspective`) is separate from the By Customer `viewConfig`.

---

## 7. Flag Write-back (CRM bridge)

**Required Reading:**
- `src/app/priceIncrease/results/_components/AssignFlagButton.tsx`
- `src/app/priceIncrease/results/_components/AssignAllButton.tsx`
- `src/app/priceIncrease/results/customerIncreaseResultsTypes.ts` (`getAssignFlagBlockReason`)
- `src/app/priceIncrease/usePriceIncreaseCustFlags.ts`
- `src/app/realGreen/custFlag/_lib/useCustFlag.ts`
- `src/app/realGreen/custFlag/_lib/custFlagListeners.ts`

There is **no price-increase-specific API route or slice** for assignment. Everything goes through the `custFlag` module:

- `useCustFlag({ flagIds, custStatuses }).addFlag({ custIds, flagId })` -> `custFlagActions.addCustFlag` (optimistic update of `flagIdCustIds` on fulfilled).
- `.addFlags(assignments: CustFlagAdd[])` -> one `addCustFlag` per flag, `showLoading: false`, `Promise.all`.

Both buttons build the same `flagIds` list (mappings + exempt + manual) that `usePriceIncreaseCustFlags` loads, so the hook's load effect is a no-op there.

### 7.1 Individual (`AssignFlagButton`)

`getAssignFlagBlockReason(result)` returns a string reason (exempt, manual, conflict, matching, override, no flag) or `null`. Non-null disables the button and becomes its tooltip. On click: `addFlag({ custIds: [custId], flagId: resolvedFlag.flagId })`.

### 7.2 En masse (`AssignAllButton`)

1. `analyzeResults(results)` partitions every result: exempt -> skipped; `conflict` -> counted and blocks the whole run; `matching` -> already correct; `override` -> skipped; `none` with a `resolvedFlag` -> eligible, grouped by `flagId` into `CustFlagAdd[]`.
2. Button disabled when `conflictCount > 0` or `eligibleCount === 0`, with inline messaging.
3. Dialog steps: `preflight` -> `password` -> `success`. The password step calls `useAuth().confirmPassword({ password })` and only proceeds when the thunk resolves truthy.
4. `addFlags(assignments)`, then a success screen with assigned / already-correct / override counts.

### 7.3 Post-write reconciliation

Two mechanisms keep `customer.flags` honest:

- **Optimistic**: `addCustFlag.fulfilled` adds the custIds to the flag's entry in `custFlag.flagIdCustIds`; `centralSelectors` re-hydrates `customer.flags`; the results selectors recompute `preExistingFlagStatus` (the just-assigned customer flips to `matching`).
- **Authoritative**: the RTK listener in `custFlagListeners.ts` fires `refreshCustFlags({ custId, flagIdsInState })` after *any* customer refresh thunk fulfills. The card's refresh icon (`useActiveCustomers().refreshCustomer`) therefore pulls the CRM truth for that customer with no extra wiring. Use it after fixing conflicts in RealGreen.

---

## 8. Config UI State

**Required Reading:**
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSlice.ts`
- `src/app/priceIncrease/config/_lib/priceIncreaseConfigSelect.ts`
- `src/app/priceIncrease/config/_components/SettingsSheet.tsx`
- `src/app/priceIncrease/config/_components/InlinePlanEditor.tsx`
- `src/app/priceIncrease/config/_components/FlagMappingsSection.tsx`
- `src/app/priceIncrease/results/_components/ActiveSettingsPanel.tsx`

`priceIncreaseConfigSlice` holds every piece of transient UI state for the module: settings draft, inline plan draft, flag mappings draft, target season override, view config, summary config, and the settings-panel toggle. No persisted data lives here.

### 8.1 Settings draft lifecycle

| Action | Effect |
|---|---|
| `openSettingsSheet(doc)` | Sets draft, opens the sheet, closes any inline plan editor. New docs are built by `SettingsSection` with `settingsId: crypto.randomUUID()`. |
| `seedSettingsDraft(doc)` | Sets draft **without** opening the sheet. Used by `ActiveSettingsPanel` so the left panel edits the active settings live. |
| `updateSettingsDraft(partial)` | Merge. |
| `closeSettingsSheet()` | Hides the sheet but **keeps the draft**, so the user can go look at Summary / By Customer with the draft applied and come back. |
| `discardSettingsDraft()` | Clears the draft (and sheet). Called after a successful save and by Discard. |

`priceIncreaseConfigSelect.settingsIsDirty` deep-compares the draft to its stored doc (new doc = always dirty). Because `priceIncreaseConfigSelect.settings` prefers the draft, **an open draft changes the results everywhere** - that is the intended live-preview behavior, but it also means a stale draft left behind will silently drive the Summary tab. Save or discard.

### 8.2 Inline season plan editor

`inlinePlanMode` is `closed | new | edit(seasonIncreasesId)`; `inlinePlanDraft` is a full `SeasonIncreasesDoc`. `openInlinePlanNew` generates the UUID. Rows are appended with `season = length + 2` and `increasePercent: 0`; `InlinePlanEditor` renumbers on save and dispatches `upsertSeasonIncreases`, then calls `onPlanSavedAction(seasonIncreasesId)` so the parent selects the new plan in the settings draft. `inlinePlanDraftRows` adds a running cumulative percent for display; `inlinePlanCanSave` = dirty and label non-empty.

### 8.3 Flag mappings

`ConfigPanel` seeds `flagMappingsDraft` from `globalSettingsSelect.increaseFlagMappings` on mount. `FlagPicker` is a dual list (available / mapped) driven by `availableFlags`, `flagMappingsDraftHydrated` (sorted ascending by percent) and `flagPickerSelectedId`. Save is enabled by `flagMappingsIsDirty && flagMappingsIsValid` and performs an **optimistic** `globalSettingsActions.setSettings` followed by `updateSettings`, so the dirty indicator clears immediately. Exempt/manual dropdowns save the same way on change.

### 8.4 Settings panel (Summary / By Customer)

`settingsPanelOpen` toggles a 288px left panel rendering `ActiveSettingsPanel`, a compact version of the sheet that seeds and edits the draft in place. The layout hides the toggle on `/priceIncrease/config` because that page has the full UI.

---

## 9. Layout and Navigation

**Required Reading:**
- `src/app/priceIncrease/layout.tsx`
- `src/app/priceIncrease/_components/TargetSeasonControl.tsx`
- `src/app/priceIncrease/results/_components/DataIssuesPopover.tsx`

Standard tab-routed page: `layout.tsx` renders `PageLayout` with `TabNav` (Config / Summary / By Customer, root `/priceIncrease/config`), calls `usePriceIncreaseDeps()` once, and `page.tsx` redirects to Config. Sub-route pages are thin.

Header left slot: settings-panel toggle (hidden on Config), `TargetSeasonControl`, `DataIssuesPopover`.

**Target season restore:** on mount the layout reads `localStorage["priceIncrease.targetSeason"]` via `useLocalStorage` (6-month TTL) and dispatches `setTargetSeasonOverride`. `TargetSeasonControl` writes both Redux and localStorage; stepping back down to the global season clears both.

Scroll: the layout body is `flex h-full overflow-hidden`; each page establishes its own `overflow-y-auto` region (By Customer's card list, Summary's wrapper, ConfigPanel's wrapper).

---

## 10. Maintenance Playbooks

Each recipe lists only the files to touch. Read the Required Reading of the referenced section first.

### Add a settings field (sections 2, 8)
1. `settings/PriceIncreaseSettingsTypes.ts` - add to `PriceIncreaseSettingsDoc`.
2. `settings/PriceIncreaseSettingsModel.ts` - add to the schema (`required: true` plus a default if existing docs must keep working).
3. `config/_components/SettingsSheet.tsx` and `results/_components/ActiveSettingsPanel.tsx` - add the input in both forms.
4. `config/_components/SettingsSection.tsx` - the new-doc factory needs a default value.
5. Consume it in `results/customerIncreaseResultsSelect.ts` (or `makeServiceIncreaseResult.ts` if per-service). It arrives automatically via `priceIncreaseConfigSelect.settings`.

### Add a sortable or groupable property (section 5)
1. `results/customerIncreaseResultsTypes.ts` - add to `SortableIncreaseProperties` or `GroupableIncreaseProperties`.
2. `results/customerIncreaseResultsSelect.ts` - compute it into `sortable` / `groupable`.
3. `results/customerIncreaseSortFns.ts` or `customerIncreaseGroupFns.ts` - add the fn **and** the label. TypeScript fails until both exist.

Nothing else changes; the pickers and `applyIncreaseView` are registry-driven.

### Add a data issue kind (section 4.2)
1. `results/increaseResultsTypes.ts` - extend `IncreaseDataIssueMissingField`.
2. Emit it from `makeServiceIncreaseResult.ts` (service-level) or the program loop in `serviceIncreaseResultsSelect.ts` (program-level).
3. `results/_components/DataIssuesPopover.tsx` groups by `missingField` automatically; add a friendly heading if desired.

### Add a summary perspective (section 6)
1. `config/_lib/priceIncreaseConfigSlice.ts` - extend `SummaryFlagPerspective`.
2. `summary/priceIncreaseSummarySelect.ts` - build the group list with `buildFlagGroups`, add it to `PriceIncreaseSummary` and to `perspectiveMap`.
3. `summary/page.tsx` - add the toggle option.

### Change flag resolution or cap semantics (section 3)
Edit `_lib/priceIncreaseFuncs.ts` only. The selectors pass primitives; nothing upstream needs to change. Update section 1.4 of this document if user-visible behavior changes.

### Restore manual customers to results
Follow section 4.5.

### Track cumulative increases (lift the `maxIncreaseEver` limitation)
Needs a native store of per-customer applied increases. Once it exists, replace the `cumulativeIncreaseToDate: 0` literal in `results/customerIncreaseResultsSelect.ts` and update section 1.7.

### Verification after any change
- `ide_diagnostics` / lint on the edited files.
- `tsc --noEmit` when types in `results/` or `settings/` changed (the registries and `satisfies CustomerIncreaseResult` catch omissions project-wide).
- Open By Customer with a draft open and confirm the formula strip updates live.
