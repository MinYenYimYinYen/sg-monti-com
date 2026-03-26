import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { EquipmentContract } from "@/app/equipment/api/EquipmentContract";

type EquipmentState = {
  equipmentDocs: EquipmentDoc[];
};

const initialState: EquipmentState = { equipmentDocs: [] };

const equipmentSlice = createSlice({
  name: "equipment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.equipmentDocs = action.payload;
    });
    builder.addCase(upsert.fulfilled, (state, action) => {
      const updatedDoc = action.payload;
      const existingIndex = state.equipmentDocs.findIndex(
        (doc) => doc.equipmentId === updatedDoc.equipmentId,
      );
      const newDocs: EquipmentDoc[] = [...state.equipmentDocs];
      if (existingIndex !== -1) {
        newDocs[existingIndex] = updatedDoc;
      } else {
        newDocs.push(updatedDoc);
      }
      state.equipmentDocs = newDocs;
    });
    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deletedDoc = action.payload;
      state.equipmentDocs = state.equipmentDocs.filter(
        (doc) => doc.equipmentId !== deletedDoc.equipmentId,
      );
    });
  },
});

const getAll = createStandardThunk<EquipmentContract, "getAll">({
  opName: "getAll",
  typePrefix: "equipment/getAll",
  apiPath: "/equipment/api",
});

const upsert = createStandardThunk<EquipmentContract, "upsert">({
  opName: "upsert",
  typePrefix: "equipment/upsert",
  apiPath: "/equipment/api",
});

const deleteOne = createStandardThunk<EquipmentContract, "deleteOne">({
  opName: "deleteOne",
  typePrefix: "equipment/deleteOne",
  apiPath: "/equipment/api",
});

export const equipmentReducer = equipmentSlice.reducer;
export const equipmentActions = {
  ...equipmentSlice.actions,
  getAll,
  upsert,
  deleteOne,
};
