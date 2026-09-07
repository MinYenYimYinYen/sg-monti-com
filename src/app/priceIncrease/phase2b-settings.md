# Phase 2B — PriceIncreaseSettings Module + GlobalSettings Extension

**Goal:** Implement the PriceIncreaseSettings data module, extend GlobalSettings with increase flag fields, and register the reducer.

**Prerequisite:** Phase 1 complete. `PriceIncreaseTypes.ts` exists and exports `IncreaseFlagMapping`.

**Key design decisions (post-implementation):**
- `settingsId` is a **UUID generated client-side** via `crypto.randomUUID()`. Users only enter a label.
- `exemptFlagId` and `manualFlagId` are **not** on `PriceIncreaseSettingsDoc`. They live on `GlobalSettings` as `priceIncreaseExemptFlagId` and `priceIncreaseManualFlagId`.
- `priceIncreaseSelect.ts` reads exempt/manual flag IDs from `globalSettingsSelect`, not from the settings doc.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `IncreaseFlagMapping` type
- `src/app/bizPlan/seasonPlan/api/SeasonPlanModel.ts` — multi-document model pattern
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` — type to extend
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts` — model to extend
- `src/app/globalSettings/api/GlobalSettingsContract.ts` — contract (no change needed)
- `src/app/globalSettings/api/route.ts` — route (no change needed)
- `src/store/reducers/index.ts` — where to register the reducer
- `src/store/reduxUtil/thunkFactories.ts` — `createStandardThunk`
- `src/lib/mongoose/createModel.ts` — `createModel` helper
- `src/lib/mongoose/mongooseTypes.ts` — `CreatedUpdated`
- `src/lib/api/api.readme.md` — contract + route pattern

---

## Part A — Extend GlobalSettings

### A1 — Update `GlobalSettingsTypes.ts`

Add to imports:
```typescript
import { IncreaseFlagMapping } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
```

Add to `GlobalSettings` type:
```typescript
increaseFlagMappings: IncreaseFlagMapping[];
priceIncreaseExemptFlagId: number | null;
priceIncreaseManualFlagId: number | null;
```

### A2 — Update `GlobalSettingsModel.ts`

Add sub-schema and fields:
```typescript
const IncreaseFlagMappingSchema = new mongoose.Schema(
  { flagId: { type: Number, required: true }, increasePercent: { type: Number, required: true } },
  { _id: false },
);
// In GlobalSettingsSchema:
increaseFlagMappings: { type: [IncreaseFlagMappingSchema], required: true, default: [] },
priceIncreaseExemptFlagId: { type: Number, default: null },
priceIncreaseManualFlagId: { type: Number, default: null },
```

### A3 — Update `baseGlobalSettings.ts`

```typescript
increaseFlagMappings: [],
priceIncreaseExemptFlagId: null,
priceIncreaseManualFlagId: null,
```

### A4 — Update `globalSettingsSelect.ts`

Add selectors:
```typescript
const selectIncreaseFlagMappings = createSelector([selectSettings], (s) => s.increaseFlagMappings);
const selectPriceIncreaseExemptFlagId = createSelector([selectSettings], (s) => s.priceIncreaseExemptFlagId);
const selectPriceIncreaseManualFlagId = createSelector([selectSettings], (s) => s.priceIncreaseManualFlagId);

export const globalSettingsSelect = {
  // ...existing...
  increaseFlagMappings: selectIncreaseFlagMappings,
  priceIncreaseExemptFlagId: selectPriceIncreaseExemptFlagId,
  priceIncreaseManualFlagId: selectPriceIncreaseManualFlagId,
};
```

The `GlobalSettingsContract.updateSettings` already accepts `Partial<GlobalSettings>`, so it automatically supports the new fields — no contract change needed.

---

## Part B — PriceIncreaseSettings Data Module

### B1 — `PriceIncreaseSettingsTypes.ts`

**File:** `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts`

```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type FlagRounding = "round" | "ceil" | "floor";

export type PriceIncreaseSettingsDoc = CreatedUpdated & {
  settingsId: string;
  label: string;
  isActive: boolean;
  seasonIncreasesId: string;
  progCodeId: string;
  maxIncreaseNow: number;
  maxIncreaseEver: number;
  ongoingIncrease: number;
  upsellBonusThreshold: number;
  upsellBonusPercent: number;
  minPriceIncrease: number;
  manualAttentionThreshold: number;
  flagRounding: FlagRounding;
};
```

Note: No `exemptFlagId` or `manualFlagId` — those are on `GlobalSettings`.

### B2 — `PriceIncreaseSettingsModel.ts`

```typescript
import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

const PriceIncreaseSettingsSchema = new Schema<PriceIncreaseSettingsDoc>(
  {
    settingsId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: false },
    seasonIncreasesId: { type: String, required: true },
    progCodeId: { type: String, required: true },
    maxIncreaseNow: { type: Number, required: true },
    maxIncreaseEver: { type: Number, required: true },
    ongoingIncrease: { type: Number, required: true },
    upsellBonusThreshold: { type: Number, required: true },
    upsellBonusPercent: { type: Number, required: true },
    minPriceIncrease: { type: Number, required: true },
    manualAttentionThreshold: { type: Number, required: true },
    flagRounding: { type: String, enum: ["round", "ceil", "floor"], required: true },
  },
  { timestamps: true },
);

export const PriceIncreaseSettingsModel = createModel<PriceIncreaseSettingsDoc>(
  "PriceIncreaseSettings",
  PriceIncreaseSettingsSchema,
);
```

### B3 — `PriceIncreaseSettingsContract.ts`

```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

export interface PriceIncreaseSettingsContract extends ApiContract {
  getAll: { params: Record<string, never>; result: DataResponse<PriceIncreaseSettingsDoc[]> };
  upsert: { params: Omit<PriceIncreaseSettingsDoc, "createdAt" | "updatedAt">; result: DataResponse<PriceIncreaseSettingsDoc> };
  setActive: { params: { settingsId: string }; result: DataResponse<boolean> };
  remove: { params: { settingsId: string }; result: DataResponse<boolean> };
}
```

### B4 — `route.ts`

Handlers: `getAll`, `upsert`, `setActive` (deactivates all then activates target), `remove`.

### B5 — `settingsSlice.ts`

Thunks: `getAllPriceIncreaseSettings`, `upsertPriceIncreaseSettings`, `setActivePriceIncreaseSettings`, `removePriceIncreaseSettings`.

`setActivePriceIncreaseSettings.fulfilled` optimistically updates `isActive` on all docs in state.

### B6 — `settingsSelect.ts`

```typescript
const selectActiveDoc = createSelector([selectDocs], (docs) =>
  docs.find((d) => d.isActive) ?? null,
);

export const priceIncreaseSettingsSelect = { docs: selectDocs, activeDoc: selectActiveDoc };
```

### B7 — `useSettings.ts`

Dispatches `getAllPriceIncreaseSettings` on mount.

### B8 — Register Reducer

```typescript
import priceIncreaseSettingsReducer from "@/app/priceIncrease/settings/settingsSlice";
// ...
priceIncreaseSettings: priceIncreaseSettingsReducer,
```

---

## Part C — Update `priceIncreaseSelect.ts`

After Phase 2B, update `priceIncreaseSelect.ts` to read exempt/manual flag IDs from `globalSettingsSelect`:

```typescript
const selectResults = createSelector(
  [
    centralSelect.customers,
    priceIncreaseSettingsSelect.activeDoc,
    seasonIncreasesSelect.activeDoc,
    selectIncreaseFlags,
    globalSettingsSelect.season,
    globalSettingsSelect.priceIncreaseExemptFlagId,   // from GlobalSettings
    globalSettingsSelect.priceIncreaseManualFlagId,   // from GlobalSettings
  ],
  (customers, settings, seasonIncreasesDoc, increaseFlags, currentSeason, exemptFlagId, manualFlagId) => {
    // ...
    const isExempt = exemptFlagId !== null && customer.flags.some((f) => f.flagId === exemptFlagId);
    const isManual = manualFlagId !== null && customer.flags.some((f) => f.flagId === manualFlagId);
    // ...
  },
);
```

---

## Verification

Run `ide_diagnostics` on all modified and new files. Confirm no type errors before proceeding to Phase 3.
