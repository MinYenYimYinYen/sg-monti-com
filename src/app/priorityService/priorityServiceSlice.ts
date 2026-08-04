import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { PriorityServiceContract } from "@/app/priorityService/api/PriorityServiceContract";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";

type PriorityServiceState = {
  docs: PriorityServiceDoc[];
};

const initialState: PriorityServiceState = {
  docs: [],
};

const getAll = createStandardThunk<PriorityServiceContract, "getAll">({
  typePrefix: "priorityService/getAll",
  apiPath: "/priorityService/api",
  opName: "getAll",
});

const upsert = createStandardThunk<PriorityServiceContract, "upsert">({
  typePrefix: "priorityService/upsert",
  apiPath: "/priorityService/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<PriorityServiceContract, "deleteOne">({
  typePrefix: "priorityService/deleteOne",
  apiPath: "/priorityService/api",
  opName: "deleteOne",
});

const priorityServiceSlice = createSlice({
  name: "priorityService",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.docs = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.docs.findIndex((d) => d.servId === updated.servId);
      if (idx !== -1) {
        state.docs[idx] = updated;
      } else {
        state.docs.push(updated);
      }
    });

    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.docs = state.docs.filter((d) => d.servId !== deleted.servId);
    });
  },
});

export const priorityServiceActions = {
  getAll,
  upsert,
  deleteOne,
};

export const priorityServiceReducer = priorityServiceSlice.reducer;
