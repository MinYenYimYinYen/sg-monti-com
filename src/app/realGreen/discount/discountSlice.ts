import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { DiscountContract } from "@/app/realGreen/discount/api/DiscountContract";
import { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";
import { createSlice } from "@reduxjs/toolkit";

export const getDiscountDocs = createStandardThunk<DiscountContract, "getAll">({
  typePrefix: "discount/getAll",
  apiPath: "/realGreen/discount/api",
  opName: "getAll",
});

type DiscountState = {
  discountDocs: DiscountDoc[];
};

const initialState: DiscountState = {
  discountDocs: [],
};

const discountSlice = createSlice({
  name: "discount",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getDiscountDocs.fulfilled, (state, action) => {
      state.discountDocs = action.payload;
    });
  },
});

export const discountActions = {...discountSlice.actions, getDiscountDocs}
export default discountSlice.reducer;

