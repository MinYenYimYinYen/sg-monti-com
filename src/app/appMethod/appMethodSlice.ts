import { AppMethodDoc } from "@/app/appMethod/AppMethodTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AppMethodContract } from "@/app/appMethod/api/AppMethodContract";

type appMethodState = {
  appMethodDocs: AppMethodDoc[];
};

const initialState: appMethodState = { appMethodDocs: [] };

const appMethodSlice = createSlice({
  name: "appMethod",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.appMethodDocs = action.payload;
    });
    builder.addCase(upsert.fulfilled, (state, action) => {
      const updatedDoc = action.payload;
      const existingIndex = state.appMethodDocs.findIndex(
        (doc) => doc.appMethodId === updatedDoc.appMethodId,
      );
      const newDocs: AppMethodDoc[] = [...state.appMethodDocs];
      if (existingIndex !== -1) {
        newDocs[existingIndex] = updatedDoc;
      } else {
        newDocs.push(updatedDoc);
      }
      state.appMethodDocs = newDocs;
    });
    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deletedDoc = action.payload;
      state.appMethodDocs = state.appMethodDocs.filter(
        (doc) => doc.appMethodId !== deletedDoc.appMethodId,
      );
    });
  },
});

const getAll = createStandardThunk<AppMethodContract, "getAll">({
  opName: "getAll",
  typePrefix: "appMethod/getAll",
  apiPath: "/appMethod/api",
});

const upsert = createStandardThunk<AppMethodContract, "upsert">({
  opName: "upsert",
  typePrefix: "appMethod/upsert",
  apiPath: "/appMethod/api",
});

const deleteOne = createStandardThunk<AppMethodContract, "deleteOne">({
  opName: "deleteOne",
  typePrefix: "appMethod/deleteOne",
  apiPath: "/appMethod/api",
});

export const appMethodReducer = appMethodSlice.reducer;
export const appMethodActions = {
  ...appMethodSlice.actions,
  getAll,
  upsert,
  deleteOne,
};
