import { createSlice } from "@reduxjs/toolkit";

type TechRouteState = {
  tech: string | null;
  routeDate: string | null;
};
const initialState: TechRouteState = {
  tech: null,
  routeDate: null
};
export const techRouteSlice = createSlice({
  name: "techRoute",
  initialState,
  reducers: {
    setTech: (state, action) => {
      state.tech = action.payload;
    },
    setRouteDate: (state, action) => {
      state.routeDate = action.payload;
    }
  },
});

export const techRouteActions = { ...techRouteSlice.actions };
export const techRouteReducer = techRouteSlice.reducer;