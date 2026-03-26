import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { EquipmentPackageContract } from "@/app/equipment/equipmentPackage/api/EquipmentPackageContract";

type EquipmentPackageState = {
  equipmentPackageDocs: EquipmentPackageDoc[];
};

const initialState: EquipmentPackageState = { equipmentPackageDocs: [] };

const equipmentPackageSlice = createSlice({
  name: "equipmentPackage",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.equipmentPackageDocs = action.payload;
    });
    builder.addCase(upsert.fulfilled, (state, action) => {
      const updatedDoc = action.payload;
      const existingIndex = state.equipmentPackageDocs.findIndex(
        (doc) => doc.packageId === updatedDoc.packageId,
      );
      const newDocs: EquipmentPackageDoc[] = [...state.equipmentPackageDocs];
      if (existingIndex !== -1) {
        newDocs[existingIndex] = updatedDoc;
      } else {
        newDocs.push(updatedDoc);
      }
      state.equipmentPackageDocs = newDocs;
    });
    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deletedDoc = action.payload;
      state.equipmentPackageDocs = state.equipmentPackageDocs.filter(
        (doc) => doc.packageId !== deletedDoc.packageId,
      );
    });
  },
});

const getAll = createStandardThunk<EquipmentPackageContract, "getAll">({
  opName: "getAll",
  typePrefix: "equipmentPackage/getAll",
  apiPath: "/equipment/equipmentPackage/api",
});

const upsert = createStandardThunk<EquipmentPackageContract, "upsert">({
  opName: "upsert",
  typePrefix: "equipmentPackage/upsert",
  apiPath: "/equipment/equipmentPackage/api",
});

const deleteOne = createStandardThunk<EquipmentPackageContract, "deleteOne">({
  opName: "deleteOne",
  typePrefix: "equipmentPackage/deleteOne",
  apiPath: "/equipment/equipmentPackage/api",
});

export const equipmentPackageReducer = equipmentPackageSlice.reducer;
export const equipmentPackageActions = {
  ...equipmentPackageSlice.actions,
  getAll,
  upsert,
  deleteOne,
};
