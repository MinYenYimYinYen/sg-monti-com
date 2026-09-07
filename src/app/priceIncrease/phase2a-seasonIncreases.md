# Phase 2A — SeasonIncreases Data Module

**Goal:** Implement the full SeasonIncreases data module (Types → Model → Contract → Route → Slice → Select → Hook) and register the reducer.

**Prerequisite:** Phase 1 complete. `PriceIncreaseTypes.ts` exists and exports `SeasonIncrease`.

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
  isActive: boolean;
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
    seasonIncreasesId: { type: String, required: true, unique: true, maxlength: 32 },
    label: { type: String, required: true },
    isActive: { type: Boolean, required: true, default: false },
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
  setActive: {
    params: { seasonIncreasesId: string };
    result: DataResponse<boolean>;
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

  setActive: {
    roles: ["admin"],
    handler: async ({ seasonIncreasesId }) => {
      await connectToMongoDB();
      // Deactivate all, then activate the target
      await SeasonIncreasesModel.updateMany({}, { $set: { isActive: false } });
      await SeasonIncreasesModel.updateOne(
        { seasonIncreasesId },
        { $set: { isActive: true } },
      );
      return { success: true, payload: true };
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

const initialState: SeasonIncreasesState = {
  docs: [],
};

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

export const setActiveSeasonIncreases = createStandardThunk<SeasonIncreasesContract, "setActive">({
  typePrefix: "seasonIncreases/setActive",
  apiPath: "/priceIncrease/seasonIncreases/api",
  opName: "setActive",
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
    builder.addCase(setActiveSeasonIncreases.fulfilled, (state, action) => {
      // Re-fetch is triggered by the hook after setActive; optimistic update:
      // read the id from the original action arg
      const id = (action.meta.arg as { params: { seasonIncreasesId: string } }).params.seasonIncreasesId;
      state.docs = state.docs.map((d) => ({ ...d, isActive: d.seasonIncreasesId === id }));
    });
    builder.addCase(removeSeasonIncreases.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { seasonIncreasesId: string } }).params.seasonIncreasesId;
      state.docs = state.docs.filter((d) => d.seasonIncreasesId !== id);
    });
  },
});

export const seasonIncreasesActions = {
  ...seasonIncreasesSlice.actions,
  getAllSeasonIncreases,
  upsertSeasonIncreases,
  setActiveSeasonIncreases,
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

const selectDocs = (state: AppState) => state.seasonIncreases.docs;

const selectActiveDoc = createSelector([selectDocs], (docs) =>
  docs.find((d) => d.isActive) ?? null,
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

Add the import:

```typescript
import seasonIncreasesReducer from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";
```

Add to `combineReducers`:

```typescript
seasonIncreases: seasonIncreasesReducer,
```

Also add the `AppState` type extension — the `AppState` type is inferred from the root reducer, so registering the reducer is sufficient.

---

## Verification

Run `ide_diagnostics` on:
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesTypes.ts`
- `src/app/priceIncrease/seasonIncreases/SeasonIncreasesModel.ts`
- `src/app/priceIncrease/seasonIncreases/api/SeasonIncreasesContract.ts`
- `src/app/priceIncrease/seasonIncreases/api/route.ts`
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSlice.ts`
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts`
- `src/app/priceIncrease/seasonIncreases/useSeasonIncreases.ts`
- `src/store/reducers/index.ts`

Confirm no type errors before proceeding to Phase 2B.
