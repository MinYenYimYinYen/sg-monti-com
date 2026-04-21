import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { QSCustomerState } from "./QuickSendTypes";

type QuickSendState = {
  templateHtml: string;
  customer: QSCustomerState;
};

const initialState: QuickSendState = {
  templateHtml: "",
  customer: {
    custId: null,
    customer: null,
    nameOverride: "",
    sizeOverride: "",
  },
};

const quickSendSlice = createSlice({
  name: "quickSend",
  initialState,
  reducers: {
    setTemplateHtml(state, action: PayloadAction<string>) {
      state.templateHtml = action.payload;
    },
    setCustId(state, action: PayloadAction<number | null>) {
      state.customer.custId = action.payload;
      // Clear loaded customer when ID changes
      state.customer.customer = null;
      state.customer.nameOverride = "";
      state.customer.sizeOverride = "";
    },
    setCustomer(state, action: PayloadAction<Customer>) {
      state.customer.customer = action.payload;
      // Pre-fill overrides only if they are currently empty
      if (!state.customer.nameOverride) {
        state.customer.nameOverride = action.payload.displayName;
      }
      if (!state.customer.sizeOverride) {
        state.customer.sizeOverride = String(action.payload.size);
      }
    },
    setNameOverride(state, action: PayloadAction<string>) {
      state.customer.nameOverride = action.payload;
    },
    setSizeOverride(state, action: PayloadAction<string>) {
      state.customer.sizeOverride = action.payload;
    },
    clearCustomer(state) {
      state.customer = initialState.customer;
    },
  },
});

export const quickSendActions = quickSendSlice.actions;
export default quickSendSlice.reducer;
