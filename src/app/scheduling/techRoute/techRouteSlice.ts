import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  baseLoadoutInventory,
  LoadoutBase,
  LoadoutInventory,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";



type TechRouteState = {
  tech: string | null;
  routeDate: string | null;
  startLoadout: LoadoutInventory;
};
const initialState: TechRouteState = {
  tech: null,
  routeDate: null,
  startLoadout: baseLoadoutInventory
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
    },
    updateStartLoadout: (state, action: PayloadAction<Partial<LoadoutBase>>) => {
      state.startLoadout = { ...state.startLoadout, ...action.payload };
    }

  },
});

export const techRouteActions = { ...techRouteSlice.actions };
export const techRouteReducer = techRouteSlice.reducer;
