import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { QSCustomerState, QSProgramConfig } from "./QuickSendTypes";

type QuickSendState = {
  templateHtml: string;
  customer: QSCustomerState;
  programConfigs: QSProgramConfig[];
};

const initialState: QuickSendState = {
  templateHtml: "",
  customer: {
    custId: null,
    customer: null,
    nameOverride: "",
    sizeOverride: "",
  },
  programConfigs: [],
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

    /** Adds a program config initialized with all non-service-call ServCode IDs. No-op if already present. */
    addProgramConfig(state, action: PayloadAction<ProgCode>) {
      const progCode = action.payload;
      const alreadyExists = state.programConfigs.some(
        (c) => c.progCodeId === progCode.progCodeId,
      );
      if (alreadyExists) return;
      const includedServCodeIds = progCode.servCodes
        .filter((s) => !s.isServiceCall)
        .map((s) => s.servCodeId);
      state.programConfigs.push({
        progCodeId: progCode.progCodeId,
        includedServCodeIds,
      });
    },

    /** Removes a program config by progCodeId. */
    removeProgramConfig(state, action: PayloadAction<string>) {
      state.programConfigs = state.programConfigs.filter(
        (c) => c.progCodeId !== action.payload,
      );
    },

    /** Replaces the included ServCode IDs for a given program config. */
    setIncludedServCodeIds(
      state,
      action: PayloadAction<{ progCodeId: string; servCodeIds: string[] }>,
    ) {
      const config = state.programConfigs.find(
        (c) => c.progCodeId === action.payload.progCodeId,
      );
      if (config) {
        config.includedServCodeIds = action.payload.servCodeIds;
      }
    },
  },
});

export const quickSendActions = quickSendSlice.actions;
export default quickSendSlice.reducer;
