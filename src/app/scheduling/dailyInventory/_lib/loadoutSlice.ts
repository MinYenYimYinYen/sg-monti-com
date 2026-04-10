import { LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { LoadoutContract, LoadoutKey } from "@/app/scheduling/dailyInventory/api/LoadoutContract";

type LoadoutState = {
  loadoutDocs: LoadoutDoc[];
  finishLoadoutDoc: LoadoutDoc | null;
  loadoutKeys: LoadoutKey[];
};

const initialState: LoadoutState = {
  loadoutDocs: [],
  finishLoadoutDoc: null,
  loadoutKeys: [],
};

const upsertLoadout = createStandardThunk<LoadoutContract, "upsertLoadout">({
  typePrefix: "loadout/upsertLoadout",
  opName: "upsertLoadout",
  apiPath: "/scheduling/dailyInventory/api",
});

const getFinishFormLoadout = createStandardThunk<LoadoutContract, "getLoadout">(
  {
    typePrefix: "loadout/getFinishFormLoadout",
    opName: "getLoadout",
    apiPath: "/scheduling/dailyInventory/api",
  },
);

const getLoadout = createStandardThunk<LoadoutContract, "getLoadout">({
  typePrefix: "loadout/getLoadout",
  opName: "getLoadout",
  apiPath: "/scheduling/dailyInventory/api",
});

const getLoadouts = createStandardThunk<LoadoutContract, "getLoadouts">({
  typePrefix: "loadout/getLoadouts",
  opName: "getLoadouts",
  apiPath: "/scheduling/dailyInventory/api",
});

const getLoadoutKeys = createStandardThunk<LoadoutContract, "getLoadoutKeys">({
  typePrefix: "loadout/getLoadoutKeys",
  opName: "getLoadoutKeys",
  apiPath: "/scheduling/dailyInventory/api",
});

const loadoutSlice = createSlice({
  name: "loadout",
  initialState,
  reducers: {
    clearFinishLoadout: (state) => {
      state.finishLoadoutDoc = null;
    },
    /** Patches finish amounts directly on the persisted LoadoutDoc. The selector re-derives the display. */
    updateFinishLoadoutEquipmentAmount: (
      state,
      action: PayloadAction<{
        masterProductId: number;
        equipmentId: string;
        field: "finishAmount";
        value: number | null;
      }>,
    ) => {
      if (!state.finishLoadoutDoc) return;
      const { masterProductId, equipmentId, field, value } = action.payload;
      const master = state.finishLoadoutDoc.masters.find(
        (m) => m.productId === masterProductId,
      );
      if (!master) return;
      const equipment = master.equipments.find(
        (e) => e.equipmentId === equipmentId,
      );
      if (!equipment) return;
      equipment[field] = value;
    },
    updateFinishLoadoutEquipmentConstituentAmount: (
      state,
      action: PayloadAction<{
        masterProductId: number;
        equipmentId: string;
        constituentProductId: number;
        field: "finishAmount";
        value: number | null;
      }>,
    ) => {
      if (!state.finishLoadoutDoc) return;
      const {
        masterProductId,
        equipmentId,
        constituentProductId,
        field,
        value,
      } = action.payload;
      const master = state.finishLoadoutDoc.masters.find(
        (m) => m.productId === masterProductId,
      );
      if (!master) return;
      const equipment = master.equipments.find(
        (e) => e.equipmentId === equipmentId,
      );
      if (!equipment) return;
      const constituent = equipment.constituents.find(
        (c) => c.productId === constituentProductId,
      );
      if (!constituent) return;
      constituent[field] = value;
    },
    updateFinishLoadoutMasterSubProductAmount: (
      state,
      action: PayloadAction<{
        masterProductId: number;
        subProductId: number;
        value: number | null;
      }>,
    ) => {
      if (!state.finishLoadoutDoc) return;
      const { masterProductId, subProductId, value } = action.payload;
      const master = state.finishLoadoutDoc.masters.find(
        (m) => m.productId === masterProductId,
      );
      if (!master) return;
      const sub = master.subProducts.find((s) => s.productId === subProductId);
      if (!sub) return;
      sub.finishAmount = value;
    },
    updateFinishLoadoutSingleAmount: (
      state,
      action: PayloadAction<{
        productId: number;
        value: number | null;
      }>,
    ) => {
      if (!state.finishLoadoutDoc) return;
      const { productId, value } = action.payload;
      const single = state.finishLoadoutDoc.singles.find(
        (s) => s.productId === productId,
      );
      if (!single) return;
      single.finishAmount = value;
    },
    updateFinishLoadoutSubProductAmount: (
      state,
      action: PayloadAction<{
        productId: number;
        value: number | null;
      }>,
    ) => {
      if (!state.finishLoadoutDoc) return;
      const { productId, value } = action.payload;
      const sub = state.finishLoadoutDoc.subProducts.find(
        (s) => s.productId === productId,
      );
      if (!sub) return;
      sub.finishAmount = value;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getFinishFormLoadout.fulfilled, (state, action) => {
      state.finishLoadoutDoc = action.payload;
    });

    builder.addCase(getLoadouts.fulfilled, (state, action) => {
      state.loadoutDocs = action.payload;
    });
    builder.addCase(getLoadout.fulfilled, (state, action) => {
      const loadout = action.payload;
      if (!loadout) return;
      const existingIndex = state.loadoutDocs.findIndex(
        (doc) =>
          doc.employeeId === loadout.employeeId &&
          doc.routeDate === loadout.routeDate,
      );
      if (existingIndex !== -1) {
        state.loadoutDocs[existingIndex] = loadout;
      } else {
        state.loadoutDocs.push(loadout);
      }
    });

    builder.addCase(getLoadoutKeys.fulfilled, (state, action) => {
      state.loadoutKeys = action.payload;
    });

    builder.addCase(upsertLoadout.fulfilled, (state, action) => {
      const upserted = action.payload;

      // Update or insert in the loadouts list
      const existingIndex = state.loadoutDocs.findIndex(
        (doc) =>
          doc.employeeId === upserted.employeeId &&
          doc.routeDate === upserted.routeDate,
      );
      if (existingIndex !== -1) {
        state.loadoutDocs[existingIndex] = upserted;
      } else {
        state.loadoutDocs.push(upserted);
      }

      // Keep finishLoadout in sync if it matches
      if (
        state.finishLoadoutDoc?.employeeId === upserted.employeeId &&
        state.finishLoadoutDoc?.routeDate === upserted.routeDate
      ) {
        state.finishLoadoutDoc = upserted;
      }
    });
  },
});

export const loadoutActions = {
  ...loadoutSlice.actions,
  upsertLoadout,
  getFinishFormLoadout,
  getLoadouts,
  getLoadout,
  getLoadoutKeys,
};
export const loadoutReducer = loadoutSlice.reducer;
