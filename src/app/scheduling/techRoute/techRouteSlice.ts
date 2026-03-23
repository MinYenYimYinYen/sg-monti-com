import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type LeftWith = {
  productId: number;
  amount: number;
};

type TechRouteState = {
  tech: string | null;
  routeDate: string | null;
  leftWith: LeftWith[];
};
const initialState: TechRouteState = {
  tech: null,
  routeDate: null,
  leftWith: [],
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
    toggleLeftWith: (state, action: PayloadAction<LeftWith>) => {
      const index = state.leftWith.findIndex(
        (item) => item.productId === action.payload.productId
      );
      if (index === -1) {
        state.leftWith.push(action.payload);
      } else {
        state.leftWith.splice(index, 1);
      }
    },
    updateLeftWith: (state, action: PayloadAction<LeftWith>) => {
      const index = state.leftWith.findIndex(
        (item) => item.productId === action.payload.productId
      );
      if (index !== -1) {
        state.leftWith[index] = action.payload;
      }
    },

    clearLeftWith: (state) => {
      state.leftWith = [];
    }
  },
});

export const techRouteActions = { ...techRouteSlice.actions };
export const techRouteReducer = techRouteSlice.reducer;
