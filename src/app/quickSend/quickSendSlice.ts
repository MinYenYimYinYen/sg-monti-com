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

    /**
     * Adds a program config for the given alias + progCode.
     * No-op if a config with that alias already exists.
     *
     * The alias is the mention ID segment (e.g. "MLC", "MLC_2"). Multiple
     * configs can share the same progCodeId but must have distinct aliases.
     */
    addProgramConfig(
      state,
      action: PayloadAction<{ alias: string; progCode: ProgCode }>,
    ) {
      const { alias, progCode } = action.payload;
      const alreadyExists = state.programConfigs.some((c) => c.alias === alias);
      if (alreadyExists) return;
      const includedServCodeIds = progCode.servCodes
        .filter((s) => !s.isServiceCall)
        .map((s) => s.servCodeId);
      state.programConfigs.push({
        alias,
        progCodeId: progCode.progCodeId,
        includedServCodeIds,
      } satisfies QSProgramConfig);
    },

    /** Removes a program config by alias. */
    removeProgramConfig(state, action: PayloadAction<string>) {
      state.programConfigs = state.programConfigs.filter(
        (c) => c.alias !== action.payload,
      );
    },

    /** Replaces the included ServCode IDs for a given program config (by alias). */
    setIncludedServCodeIds(
      state,
      action: PayloadAction<{ alias: string; servCodeIds: string[] }>,
    ) {
      const config = state.programConfigs.find(
        (c) => c.alias === action.payload.alias,
      );
      if (config) {
        config.includedServCodeIds = action.payload.servCodeIds;
      }
    },
  },
});

export const quickSendActions = quickSendSlice.actions;
export default quickSendSlice.reducer;
