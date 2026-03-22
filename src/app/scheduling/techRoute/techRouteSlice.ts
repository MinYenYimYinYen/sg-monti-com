import { createSlice } from "@reduxjs/toolkit";

type TechRouteState = {
  routeDate: string | null;
};
const initialState: TechRouteState = {
  routeDate: null
};
export const techRouteSlice = createSlice({
  name: "techRoute",
  initialState,
  reducers: {
    setRouteDate: (state, action) => {
      state.routeDate = action.payload;
    }
  },
});

export const techRouteActions = { ...techRouteSlice.actions };
export const techRouteReducer = techRouteSlice.reducer;