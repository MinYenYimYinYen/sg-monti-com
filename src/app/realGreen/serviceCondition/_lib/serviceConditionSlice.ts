import { ServiceConditionDoc } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ServiceConditionContract } from "@/app/realGreen/serviceCondition/api/ServiceConditionContract";
import { AppState } from "@/store";

type ServiceConditionState = {
  serviceConditionDocs: ServiceConditionDoc[];
};

const initialState: ServiceConditionState = {
  serviceConditionDocs: [],
};

const serviceConditionSlice = createSlice({
  name: "serviceCondition",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getServiceConditions.fulfilled, (state, action) => {
      const existingIds = new Set(
        state.serviceConditionDocs.map((doc) => doc.serviceConditionId),
      );
      const newDocs = action.payload.filter(
        (doc) => !existingIds.has(doc.serviceConditionId),
      );
      state.serviceConditionDocs.push(...newDocs);
    });
  },
});

const getServiceConditions = createStandardThunk<
  ServiceConditionContract,
  "getServiceConditions"
>({
  typePrefix: "serviceCondition/getServiceConditions",
  apiPath: "/realGreen/serviceCondition/api",
  opName: "getServiceConditions",
  // debug: true, // Enable for troubleshooting
  transformParams: (params, getState) => {
    const state = getState() as AppState;
    const serviceConditionDocs = state.serviceCondition.serviceConditionDocs;

    const existingServiceIds = new Set(
      serviceConditionDocs.map((doc) => doc.serviceId),
    );

    // Filter out serviceIds that already exist in state
    const newServiceIds = params.serviceIds.filter(
      (id) => !existingServiceIds.has(id),
    );

    return { serviceIds: newServiceIds };
  },
  customCondition: (arg) => {
    // Check transformed params if available (after filtering), otherwise use original
    const params = arg.__transformedParams ?? arg.params;
    // Only dispatch if there are serviceIds to fetch (prevents SQL error: WHERE IN ())
    return params.serviceIds.length !== 0;
  },
});

export const serviceConditionReducer = serviceConditionSlice.reducer;
export const serviceConditionActions = {
  ...serviceConditionSlice.actions,
  getServiceConditions,
};
