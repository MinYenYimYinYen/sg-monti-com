import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type {
  ProgramConfig,
  QuickSendState,
  RuntimeOverrides,
  Section,
} from "./QuickSendTypes";

function makeSection(sectionId: string): Section {
  return { sectionId, name: "New Section", templateHtml: "" };
}

const INITIAL_SECTION_ID = "section-1";

const INITIAL_RUNTIME_OVERRIDES: RuntimeOverrides = {
  programConfigs: {},
  globalPrepayId: undefined,
};

const initialState: QuickSendState = {
  sections: [makeSection(INITIAL_SECTION_ID)],
  activeSectionId: INITIAL_SECTION_ID,
  programConfigs: [] as ProgramConfig[],
  runtimeOverrides: INITIAL_RUNTIME_OVERRIDES,
  globalPrepayId: null,
  auxValues: {} as Record<string, string>,
  auxPurposes: {} as Record<string, string>,
  customer: {
    custId: null,
    customer: null,
    nameOverride: "",
    sizeOverride: "",
    taxRateZipOverride: null,
  },
  loadedTemplateId: null,
  loadedTemplateSaId: null,
  loadedTemplateName: null,
  loadedTemplateGroupId: null,
};

const quickSendSlice = createSlice({
  name: "quickSend",
  initialState,
  reducers: {
    // --- Section management ---

    addSection(state) {
      const id = `section-${Date.now()}`;
      state.sections.push(makeSection(id));
      state.activeSectionId = id;
    },

    reorderSections(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const [moved] = state.sections.splice(fromIndex, 1);
      state.sections.splice(toIndex, 0, moved);
    },

    removeSection(state, action: PayloadAction<string>) {
      const idx = state.sections.findIndex((s) => s.sectionId === action.payload);
      if (idx === -1 || state.sections.length === 1) return;
      state.sections.splice(idx, 1);
      if (state.activeSectionId === action.payload) {
        state.activeSectionId = state.sections[Math.max(0, idx - 1)].sectionId;
      }
    },

    setActiveSection(state, action: PayloadAction<string>) {
      state.activeSectionId = action.payload;
    },

    // --- Section name ---

    setSectionName(state, action: PayloadAction<{ sectionId: string; name: string }>) {
      const section = state.sections.find((s) => s.sectionId === action.payload.sectionId);
      if (section) section.name = action.payload.name;
    },

    // --- Template HTML ---

    setTemplateHtml(state, action: PayloadAction<{ sectionId: string; html: string }>) {
      const section = state.sections.find((s) => s.sectionId === action.payload.sectionId);
      if (section) section.templateHtml = action.payload.html;
    },

    // --- Customer ---

    setCustId(state, action: PayloadAction<number | null>) {
      state.customer.custId = action.payload;
      state.customer.customer = null;
      state.customer.nameOverride = "";
      state.customer.sizeOverride = "";
      state.customer.taxRateZipOverride = null;
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

    setTaxRateZipOverride(state, action: PayloadAction<string | null>) {
      state.customer.taxRateZipOverride = action.payload;
    },

    clearCustomer(state) {
      state.customer = initialState.customer;
    },

    // --- Aux mention values (runtime only — not persisted) ---

    setAuxValue(state, action: PayloadAction<{ id: string; value: string }>) {
      state.auxValues[action.payload.id] = action.payload.value;
    },

    // --- Aux purpose labels (template-time — persisted with template) ---

    setAuxPurpose(state, action: PayloadAction<{ id: string; purpose: string }>) {
      state.auxPurposes[action.payload.id] = action.payload.purpose;
    },

    // --- Program configs (persisted defaults) ---

    /**
     * Adds a program config with all non-service-call servCodes included.
     * No-op if a config for that progCodeId already exists.
     */
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
        priceOverride: null,
      } satisfies ProgramConfig);
    },

    /** Removes a program config by progCodeId. */
    removeProgramConfig(state, action: PayloadAction<string>) {
      state.programConfigs = state.programConfigs.filter(
        (c) => c.progCodeId !== action.payload,
      );
      // Clean up any runtime overrides for this program.
      delete state.runtimeOverrides.programConfigs[action.payload];
    },

    reorderProgramConfigs(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const [moved] = state.programConfigs.splice(fromIndex, 1);
      state.programConfigs.splice(toIndex, 0, moved);
    },

    // --- Runtime overrides (call-time, not persisted) ---

    /** Writes the included servCodeIds for a program as a runtime override. */
    setIncludedServCodeIds(state, action: PayloadAction<{ progCodeId: string; servCodeIds: string[] }>) {
      const { progCodeId, servCodeIds } = action.payload;
      if (!state.runtimeOverrides.programConfigs[progCodeId]) {
        state.runtimeOverrides.programConfigs[progCodeId] = {};
      }
      state.runtimeOverrides.programConfigs[progCodeId]!.includedServCodeIds = servCodeIds;
    },

    /** Sets a call-time per-visit price override for a program. */
    setPriceOverride(state, action: PayloadAction<{ progCodeId: string; price: number }>) {
      const { progCodeId, price } = action.payload;
      if (!state.runtimeOverrides.programConfigs[progCodeId]) {
        state.runtimeOverrides.programConfigs[progCodeId] = {};
      }
      state.runtimeOverrides.programConfigs[progCodeId]!.priceOverride = price;
    },

    /** Removes the call-time price override, reverting to the chart price. */
    clearPriceOverride(state, action: PayloadAction<string>) {
      const override = state.runtimeOverrides.programConfigs[action.payload];
      if (override) {
        delete override.priceOverride;
      }
    },

    /** Sets (or clears) the global prepay override at call time. */
    setGlobalPrepayId(state, action: PayloadAction<string | null>) {
      state.runtimeOverrides.globalPrepayId = action.payload;
    },

    // --- Loaded template state ---

    /**
     * Loads a stored template into the editor.
     * Replaces sections, programConfigs, and globalPrepayId.
     * Clears all runtime overrides and aux values.
     */
    loadTemplate(
      state,
      action: PayloadAction<{
        templateId: string;
        saId: string;
        name: string;
        groupId: string | null;
        sections: Section[];
        programConfigs: ProgramConfig[];
        globalPrepayId: string | null;
        auxPurposes?: Record<string, string>;
      }>,
    ) {
      const template = action.payload;
      state.sections =
        template.sections.length > 0
          ? template.sections
          : [makeSection(INITIAL_SECTION_ID)];
      state.activeSectionId = state.sections[0].sectionId;
      state.programConfigs = template.programConfigs;
      state.globalPrepayId = template.globalPrepayId;
      state.runtimeOverrides = INITIAL_RUNTIME_OVERRIDES;
      state.auxValues = {};
      state.auxPurposes = template.auxPurposes ?? {};
      state.loadedTemplateId = template.templateId;
      state.loadedTemplateSaId = template.saId;
      state.loadedTemplateName = template.name;
      state.loadedTemplateGroupId = template.groupId;
    },

    /** Resets the editor to a blank state (new template). */
    clearTemplate(state) {
      state.sections = [makeSection(INITIAL_SECTION_ID)];
      state.activeSectionId = INITIAL_SECTION_ID;
      state.programConfigs = [];
      state.globalPrepayId = null;
      state.runtimeOverrides = INITIAL_RUNTIME_OVERRIDES;
      state.auxValues = {};
      state.auxPurposes = {};
      state.loadedTemplateId = null;
      state.loadedTemplateSaId = null;
      state.loadedTemplateName = null;
      state.loadedTemplateGroupId = null;
    },
  },
});

export const quickSendActions = quickSendSlice.actions;
export default quickSendSlice.reducer;
