# Phase 2B — PriceIncreaseSettings Module + GlobalSettings Extension

**Goal:** Implement the PriceIncreaseSettings data module, extend GlobalSettings with `increaseFlagMappings`, and register the reducer.

**Prerequisite:** Phase 1 complete. `PriceIncreaseTypes.ts` exists and exports `IncreaseFlagMapping`.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `IncreaseFlagMapping` type
- `src/app/bizPlan/seasonPlan/api/SeasonPlanModel.ts` — multi-document model pattern
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts` — type to extend
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts` — model to extend
- `src/app/globalSettings/api/GlobalSettingsContract.ts` — contract to extend
- `src/app/globalSettings/api/route.ts` — route to extend
- `src/store/reducers/index.ts` — where to register the reducer
- `src/store/reduxUtil/thunkFactories.ts` — `createStandardThunk`
- `src/lib/mongoose/createModel.ts` — `createModel` helper
- `src/lib/mongoose/mongooseTypes.ts` — `CreatedUpdated`
- `src/lib/api/api.readme.md` — contract + route pattern

---

## Part A — Extend GlobalSettings

### A1 — Update `GlobalSettingsTypes.ts`

**File:** `src/app/globalSettings/_lib/GlobalSettingsTypes.ts`

Add the `IncreaseFlagMapping` import and the new field to `GlobalSettings`:

```typescript
import { IncreaseFlagMapping } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
```

Add to the `GlobalSettings` type:

```typescript
increaseFlagMappings: IncreaseFlagMapping[];
```

### A2 — Update `GlobalSettingsModel.ts`

**File:** `src/app/globalSettings/_lib/GlobalSettingsModel.ts`

Add a sub-schema for `IncreaseFlagMapping` and add the field to `GlobalSettingsSchema`:

```typescript
const IncreaseFlagMappingSchema = new mongoose.Schema(
  {
    flagId: { type: Number, required: true },
    increasePercent: { type: Number, required: true },
  },
  { _id: false },
);
```

Add to `GlobalSettingsSchema`:

```typescript
increaseFlagMappings: {
  type: [IncreaseFlagMappingSchema],
  required: true,
  default: [],
},
```

### A3 — Update `baseGlobalSettings`

**File:** `src/app/globalSettings/_lib/baseGlobalSettings.ts`

Add the default value:

```typescript
increaseFlagMappings: [],
```

### A4 — Update `GlobalSettingsContract.ts`

**File:** `src/app/globalSettings/api/GlobalSettingsContract.ts`

The `updateSettings` operation already accepts `Partial<GlobalSettings>`, so it automatically supports `increaseFlagMappings`. No contract change needed — the type flows through automatically once `GlobalSettings` is updated.

### A5 — Verify `globalSettingsSelect.ts`

**File:** `src/app/globalSettings/_lib/globalSettingsSelect.ts`

Add a selector for `increaseFlagMappings`:

```typescript
const selectIncreaseFlagMappings = createSelector(
  [selectSettings],
  (settings) => settings.increaseFlagMappings,
);
```

Add to the `globalSettingsSelect` export object:

```typescript
increaseFlagMappings: selectIncreaseFlagMappings,
```

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
  exemptFlagId: number | null;
  manualFlagId: number | null;
  manualAttentionThreshold: number;
  flagRounding: FlagRounding;
};
```

### B2 — `PriceIncreaseSettingsModel.ts`

**File:** `src/app/priceIncrease/settings/PriceIncreaseSettingsModel.ts`

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
    exemptFlagId: { type: Number, default: null },
    manualFlagId: { type: Number, default: null },
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

**File:** `src/app/priceIncrease/settings/api/PriceIncreaseSettingsContract.ts`

```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

export interface PriceIncreaseSettingsContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<PriceIncreaseSettingsDoc[]>;
  };
  upsert: {
    params: Omit<PriceIncreaseSettingsDoc, "createdAt" | "updatedAt">;
    result: DataResponse<PriceIncreaseSettingsDoc>;
  };
  setActive: {
    params: { settingsId: string };
    result: DataResponse<boolean>;
  };
  remove: {
    params: { settingsId: string };
    result: DataResponse<boolean>;
  };
}
```

### B4 — `route.ts`

**File:** `src/app/priceIncrease/settings/api/route.ts`

```typescript
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { PriceIncreaseSettingsContract } from "@/app/priceIncrease/settings/api/PriceIncreaseSettingsContract";
import { PriceIncreaseSettingsModel } from "@/app/priceIncrease/settings/PriceIncreaseSettingsModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<PriceIncreaseSettingsContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await PriceIncreaseSettingsModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const { settingsId, ...rest } = params;
      const doc = await PriceIncreaseSettingsModel.findOneAndUpdate(
        { settingsId },
        { $set: { settingsId, ...rest } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  setActive: {
    roles: ["admin"],
    handler: async ({ settingsId }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the target
      await PriceIncreaseSettingsModel.updateMany({}, { $set: { isActive: false } });
      await PriceIncreaseSettingsModel.updateOne(
        { settingsId },
        { $set: { isActive: true } },
      );
      return { success: true, payload: true };
    },
  },

  remove: {
    roles: ["admin"],
    handler: async ({ settingsId }) => {
      await connectToMongoDB();
      await PriceIncreaseSettingsModel.deleteOne({ settingsId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
```

### B5 — `settingsSlice.ts`

**File:** `src/app/priceIncrease/settings/settingsSlice.ts`

```typescript
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { PriceIncreaseSettingsContract } from "@/app/priceIncrease/settings/api/PriceIncreaseSettingsContract";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

type PriceIncreaseSettingsState = {
  docs: PriceIncreaseSettingsDoc[];
};

const initialState: PriceIncreaseSettingsState = {
  docs: [],
};

export const getAllPriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "getAll">({
  typePrefix: "priceIncreaseSettings/getAll",
  apiPath: "/priceIncrease/settings/api",
  opName: "getAll",
});

export const upsertPriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "upsert">({
  typePrefix: "priceIncreaseSettings/upsert",
  apiPath: "/priceIncrease/settings/api",
  opName: "upsert",
});

export const setActivePriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "setActive">({
  typePrefix: "priceIncreaseSettings/setActive",
  apiPath: "/priceIncrease/settings/api",
  opName: "setActive",
});

export const removePriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "remove">({
  typePrefix: "priceIncreaseSettings/remove",
  apiPath: "/priceIncrease/settings/api",
  opName: "remove",
});

const settingsSlice = createSlice({
  name: "priceIncreaseSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllPriceIncreaseSettings.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertPriceIncreaseSettings.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex((d) => d.settingsId === updated.settingsId);
      if (idx >= 0) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    builder.addCase(setActivePriceIncreaseSettings.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { settingsId: string } }).params.settingsId;
      state.docs = state.docs.map((d) => ({ ...d, isActive: d.settingsId === id }));
    });
    builder.addCase(removePriceIncreaseSettings.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { settingsId: string } }).params.settingsId;
      state.docs = state.docs.filter((d) => d.settingsId !== id);
    });
  },
});

export const priceIncreaseSettingsActions = {
  ...settingsSlice.actions,
  getAllPriceIncreaseSettings,
  upsertPriceIncreaseSettings,
  setActivePriceIncreaseSettings,
  removePriceIncreaseSettings,
};

export default settingsSlice.reducer;
```

### B6 — `settingsSelect.ts`

**File:** `src/app/priceIncrease/settings/settingsSelect.ts`

```typescript
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.priceIncreaseSettings.docs;

const selectActiveDoc = createSelector([selectDocs], (docs) =>
  docs.find((d) => d.isActive) ?? null,
);

export const priceIncreaseSettingsSelect = {
  docs: selectDocs,
  activeDoc: selectActiveDoc,
};
```

### B7 — `useSettings.ts`

**File:** `src/app/priceIncrease/settings/useSettings.ts`

```typescript
import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";

export function usePriceIncreaseSettings() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      priceIncreaseSettingsActions.getAllPriceIncreaseSettings({
        params: {},
        config: { loadingMsg: "Loading price increase settings..." },
      }),
    );
  }, [dispatch]);
}
```

### B8 — Register Reducer

**File:** `src/store/reducers/index.ts`

Add the import:

```typescript
import priceIncreaseSettingsReducer from "@/app/priceIncrease/settings/settingsSlice";
```

Add to `combineReducers`:

```typescript
priceIncreaseSettings: priceIncreaseSettingsReducer,
```

---

## Verification

Run `ide_diagnostics` on:
- `src/app/globalSettings/_lib/GlobalSettingsTypes.ts`
- `src/app/globalSettings/_lib/GlobalSettingsModel.ts`
- `src/app/globalSettings/_lib/globalSettingsSelect.ts`
- `src/app/priceIncrease/settings/PriceIncreaseSettingsTypes.ts`
- `src/app/priceIncrease/settings/PriceIncreaseSettingsModel.ts`
- `src/app/priceIncrease/settings/api/PriceIncreaseSettingsContract.ts`
- `src/app/priceIncrease/settings/api/route.ts`
- `src/app/priceIncrease/settings/settingsSlice.ts`
- `src/app/priceIncrease/settings/settingsSelect.ts`
- `src/app/priceIncrease/settings/useSettings.ts`
- `src/store/reducers/index.ts`

Confirm no type errors before proceeding to Phase 3.
