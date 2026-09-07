# Phase 2A — SeasonIncreases Data Module

**Goal:** Implement the full SeasonIncreases data module (Types → Model → Contract → Route → Slice → Select → Hook) and register the reducer.

**Prerequisite:** Phase 1 complete. `PriceIncreaseTypes.ts` exists and exports `SeasonIncrease`.

**Key design decisions (post-implementation):**
- `SeasonIncreasesDoc` has **no `isActive` field**. The active plan is determined by `PriceIncreaseSettings.seasonIncreasesId`.
- `seasonIncreasesId` is a **UUID generated client-side** via `crypto.randomUUID()`. Users only enter a label.
- The API has **no `setActive` operation** — activation is implicit via the settings reference.
- `seasonIncreasesSelect.activeDoc` is derived by joining `priceIncreaseSettingsSelect.activeDoc.seasonIncreasesId` with the docs array.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — `SeasonIncrease` type
- `src/app/bizPlan/seasonPlan/api/SeasonPlanModel.ts` — multi-document model pattern
- `src/store/reducers/index.ts` — where to register the reducer
- `src/store/reduxUtil/thunkFactories.ts` — `createStandardThunk`
- `src/lib/mongoose/createModel.ts` — `createModel` helper
- `src/lib/mongoose/mongooseTypes.ts` — `CreatedUpdated`
- `src/lib/api/api.readme.md` — contract + route pattern

---

## Step 1 — `SeasonIncreasesTypes.ts`

**File:** `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts`

```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { SeasonIncrease } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";

export type SeasonIncreasesDoc = CreatedUpdated & {
  seasonIncreasesId: string;
  label: string;
  seasonIncreases: SeasonIncrease[];
};
```

---

## Step 2 — `SeasonIncreasesModel.ts`

**File:** `src/app/priceIncrease/seasonIncreases/SeasonIncreasesModel.ts`

```typescript
import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

const SeasonIncreaseSchema = new Schema(
  {
    season: { type: Number, required: true },
    increasePercent: { type: Number, required: true },
  },
  { _id: false },
);

const SeasonIncreasesSchema = new Schema<SeasonIncreasesDoc>(
  {
    seasonIncreasesId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    seasonIncreases: { type: [SeasonIncreaseSchema], required: true, default: [] },
  },
  { timestamps: true },
);

export const SeasonIncreasesModel = createModel<SeasonIncreasesDoc>(
  "SeasonIncreases",
  SeasonIncreasesSchema,
);
```

---

## Step 3 — `SeasonIncreasesContract.ts`

**File:** `src/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract.ts`

```typescript
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

export interface SeasonIncreasesContract extends ApiContract {
  getAll: {
    params: Record<string, never>;
    result: DataResponse<SeasonIncreasesDoc[]>;
  };
  upsert: {
    params: Omit<SeasonIncreasesDoc, "createdAt" | "updatedAt">;
    result: DataResponse<SeasonIncreasesDoc>;
  };
  remove: {
    params: { seasonIncreasesId: string };
    result: DataResponse<boolean>;
  };
}
```

---

## Step 4 — `route.ts`

**File:** `src/app/priceIncrease/seasonIncreases/api/route.ts`

```typescript
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SeasonIncreasesContract } from "@/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract";
import { SeasonIncreasesModel } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<SeasonIncreasesContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await SeasonIncreasesModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },
  upsert: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const { seasonIncreasesId, ...rest } = params;
      const doc = await SeasonIncreasesModel.findOneAndUpdate(
        { seasonIncreasesId },
        { $set: { seasonIncreasesId, ...rest } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },
  remove: {
    roles: ["admin"],
    handler: async ({ seasonIncreasesId }) => {
      await connectToMongoDB();
      await SeasonIncreasesModel.deleteOne({ seasonIncreasesId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
```

---

## Step 5 — `seasonIncreasesSlice.ts`

**File:** `src/app/priceIncrease/seasonIncreases/seasonIncreasesSlice.ts`

```typescript
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SeasonIncreasesContract } from "@/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract";
import { SeasonIncreasesDoc } from "@/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes";

type SeasonIncreasesState = {
  docs: SeasonIncreasesDoc[];
};

const initialState: SeasonIncreasesState = { docs: [] };

export const getAllSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "getAll">({
  typePrefix: "seasonIncreases/getAll",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "getAll",
});

export const upsertSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "upsert">({
  typePrefix: "seasonIncreases/upsert",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "upsert",
});

export const removeSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "remove">({
  typePrefix: "seasonIncreases/remove",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "remove",
});

const seasonIncreasesSlice = createSlice({
  name: "seasonIncreases",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllSeasonIncreases.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertSeasonIncreases.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex((d) => d.seasonIncreasesId === updated.seasonIncreasesId);
      if (idx >= 0) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    // remove: no optimistic update needed; UI re-fetches or filters locally
  },
});

export const seasonIncreasesActions = {
  ...seasonIncreasesSlice.actions,
  getAllSeasonIncreases,
  upsertSeasonIncreases,
  removeSeasonIncreases,
};

export default seasonIncreasesSlice.reducer;
```

---

## Step 6 — `seasonIncreasesSelect.ts`

**File:** `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts`

```typescript
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";

const selectDocs = (state: AppState) => state.seasonIncreases.docs;

/**
 * The active season increases doc is determined by the active PriceIncreaseSettings'
 * seasonIncreasesId — not by an isActive flag on the doc itself.
 */
const selectActiveDoc = createSelector(
  [selectDocs, priceIncreaseSettingsSelect.activeDoc],
  (docs, activeSettings) => {
    if (!activeSettings) return null;
    return docs.find((d) => d.seasonIncreasesId === activeSettings.seasonIncreasesId) ?? null;
  },
);

export const seasonIncreasesSelect = {
  docs: selectDocs,
  activeDoc: selectActiveDoc,
};
```

---

## Step 7 — `useSeasonIncreases.ts`

**File:** `src/app/priceIncrease/seasonIncreases/useSeasonIncreases.ts`

```typescript
import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { seasonIncreasesActions } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";

export function useSeasonIncreases() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      seasonIncreasesActions.getAllSeasonIncreases({
        params: {},
        config: { loadingMsg: "Loading season increases..." },
      }),
    );
  }, [dispatch]);
}
```

---

## Step 8 — Register Reducer

**File:** `src/store/reducers/index.ts`

```typescript
import seasonIncreasesReducer from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";
// ...
seasonIncreases: seasonIncreasesReducer,
```

---

## Verification

Run `ide_diagnostics` on all new files. Confirm no type errors before proceeding to Phase 2B.
