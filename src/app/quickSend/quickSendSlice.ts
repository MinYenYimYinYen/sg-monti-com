import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { QSCustomerState, QSProgramConfig, QSSection } from "./QuickSendTypes";

/** Creates a blank section with a stable ID. */
function makeSection(sectionId: string): QSSection {
  return { sectionId, templateHtml: "" };
}

const INITIAL_SECTION_ID = "section-1";

type QuickSendState = {
  sections: QSSection[];
  activeSectionId: string;
  programConfigs: QSProgramConfig[];
  customer: QSCustomerState;
};

const initialState: QuickSendState = {
  sections: [makeSection(INITIAL_SECTION_ID)],
  activeSectionId: INITIAL_SECTION_ID,
  programConfigs: [],
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
    // --- Section management ---

    /** Appends a new blank section and makes it active. */
    addSection(state) {
      const id = `section-${Date.now()}`;
      state.sections.push(makeSection(id));
      state.activeSectionId = id;
    },

    /** Removes a section by ID. If it was active, activates the previous section. */
    removeSection(state, action: PayloadAction<string>) {
      const idx = state.sections.findIndex((s) => s.sectionId === action.payload);
      if (idx === -1 || state.sections.length === 1) return;
      state.sections.splice(idx, 1);
      if (state.activeSectionId === action.payload) {
        state.activeSectionId = state.sections[Math.max(0, idx - 1)].sectionId;
      }
    },

    /** Sets the active section. */
    setActiveSection(state, action: PayloadAction<string>) {
      state.activeSectionId = action.payload;
    },

    // --- Template HTML ---

    setTemplateHtml(
      state,
      action: PayloadAction<{ sectionId: string; html: string }>,
    ) {
      const section = state.sections.find((s) => s.sectionId === action.payload.sectionId);
      if (section) section.templateHtml = action.payload.html;
    },

    // --- Customer ---

    setCustId(state, action: PayloadAction<number | null>) {
      state.customer.custId = action.payload;
      state.customer.customer = null;
      state.customer.nameOverride = "";
      state.customer.sizeOverride = "";
    },
    setCustomer(state, action: PayloadAction<Customer>) {
      state.customer.customer = action.payload;
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

    // --- Program configs (global — shared across all sections) ---

    /**
     * Adds a program config for the given alias + progCode.
     * No-op if a config with that alias already exists.
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
