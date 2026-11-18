import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SalesTaxMappingContract } from "@/app/salesTax/salesTaxMapping/api/SalesTaxMappingContract";
import { SalesTaxMappingDoc } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

type SalesTaxMappingState = {
  docs: SalesTaxMappingDoc[];
};

const initialState: SalesTaxMappingState = {
  docs: [],
};

export const getAllSalesTaxMappings = createStandardThunk<SalesTaxMappingContract, "getAll">({
  typePrefix: "salesTaxMapping/getAll",
  apiPath: "/salesTax/salesTaxMapping/api",
  opName: "getAll",
});

export const upsertSalesTaxMapping = createStandardThunk<SalesTaxMappingContract, "upsert">({
  typePrefix: "salesTaxMapping/upsert",
  apiPath: "/salesTax/salesTaxMapping/api",
  opName: "upsert",
});

export const removeSalesTaxMapping = createStandardThunk<SalesTaxMappingContract, "remove">({
  typePrefix: "salesTaxMapping/remove",
  apiPath: "/salesTax/salesTaxMapping/api",
  opName: "remove",
});

const salesTaxMappingSlice = createSlice({
  name: "salesTaxMapping",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllSalesTaxMappings.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(upsertSalesTaxMapping.fulfilled, (state, action) => {
      const updated = action.payload;
      const existingIndex = state.docs.findIndex((doc) => doc.taxCodeId === updated.taxCodeId);
      if (existingIndex >= 0) {
        state.docs[existingIndex] = updated;
      } else {
        state.docs.push(updated);
      }
    });
    builder.addCase(removeSalesTaxMapping.fulfilled, (state, action) => {
      const { taxCodeId } = action.meta.arg.params;
      state.docs = state.docs.filter((doc) => doc.taxCodeId !== taxCodeId);
    });
  },
});

export const salesTaxMappingActions = {
  getAllSalesTaxMappings,
  upsertSalesTaxMapping,
  removeSalesTaxMapping,
};

export const salesTaxMappingReducer = salesTaxMappingSlice.reducer;
