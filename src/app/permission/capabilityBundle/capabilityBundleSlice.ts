import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CapabilityBundleContract } from "@/app/permission/capabilityBundle/api/CapabilityBundleContract";
import { CapabilityBundleDoc } from "@/app/permission/capabilityBundle/CapabilityBundleTypes";

type CapabilityBundleState = {
  docs: CapabilityBundleDoc[];
};

const initialState: CapabilityBundleState = {
  docs: [],
};

const API_PATH = "/permission/capabilityBundle/api";

export const getAllCapabilityBundles = createStandardThunk<CapabilityBundleContract, "getAll">({
  typePrefix: "capabilityBundle/getAll",
  apiPath: API_PATH,
  opName: "getAll",
});

export const upsertCapabilityBundle = createStandardThunk<CapabilityBundleContract, "upsert">({
  typePrefix: "capabilityBundle/upsert",
  apiPath: API_PATH,
  opName: "upsert",
});

export const removeCapabilityBundle = createStandardThunk<CapabilityBundleContract, "remove">({
  typePrefix: "capabilityBundle/remove",
  apiPath: API_PATH,
  opName: "remove",
});

const capabilityBundleSlice = createSlice({
  name: "capabilityBundle",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllCapabilityBundles.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertCapabilityBundle.fulfilled, (state, action) => {
      const saved = action.payload.bundle;
      const existingIndex = state.docs.findIndex((doc) => doc.bundleKey === saved.bundleKey);
      if (existingIndex >= 0) {
        state.docs[existingIndex] = saved;
      } else {
        state.docs.push(saved);
      }
    });
    builder.addCase(removeCapabilityBundle.fulfilled, (state, action) => {
      state.docs = state.docs.filter((doc) => doc.bundleKey !== action.meta.arg.params.bundleKey);
    });
  },
});

export const capabilityBundleActions = {
  ...capabilityBundleSlice.actions,
  getAllCapabilityBundles,
  upsertCapabilityBundle,
  removeCapabilityBundle,
};

export default capabilityBundleSlice.reducer;
