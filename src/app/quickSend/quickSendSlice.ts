import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { QSCustomerState, QSProgramConfig, QSSection, ProgChooser, INITIAL_PROG_CHOOSER } from "./QuickSendTypes";
import { StoredTemplateDoc } from "./storedTemplates/StoredTemplateTypes";

/** Creates a blank section with a stable ID. */
function makeSection(sectionId: string): QSSection {
  return { sectionId, templateHtml: "" };
}

const INITIAL_SECTION_ID = "section-1";

type QuickSendState = {
  sections: QSSection[];
  activeSectionId: string;
  programConfigs: QSProgramConfig[];
  /**
   * Runtime values for aux mentions (`@aux`, `@aux_2`, …).
   * Keys are aux IDs (e.g. `"aux"`, `"aux_2"`); values are the user-typed strings.
   * Not persisted — cleared when a template is loaded or the editor is reset.
   */
  auxValues: Record<string, string>;
  customer: QSCustomerState;
  /** Runtime-only progChooser state. Not persisted in StoredTemplateDoc. */
  progChooser: ProgChooser;

  // Loaded template metadata (null = unsaved / new)
  loadedTemplateId: string | null;
  /** The saId of the user who authored the loaded template. */
  loadedTemplateSaId: string | null;
  loadedTemplateName: string | null;
  loadedTemplateGroupId: string | null;
};

const initialState: QuickSendState = {
  sections: [makeSection(INITIAL_SECTION_ID)],
  activeSectionId: INITIAL_SECTION_ID,
  programConfigs: [],
  auxValues: {},
  customer: {
    custId: null,
    customer: null,
    nameOverride: "",
    sizeOverride: "",
    taxRateZipOverride: null,
  },
  progChooser: INITIAL_PROG_CHOOSER,
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

    /** Appends a new blank section and makes it active. */
    addSection(state) {
      const id = `section-${Date.now()}`;
      state.sections.push(makeSection(id));
      state.activeSectionId = id;
    },

    /** Moves a section from one index to another. */
    reorderSections(state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex === toIndex) return;
      const [moved] = state.sections.splice(fromIndex, 1);
      state.sections.splice(toIndex, 0, moved);
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

    /** Sets the user-typed value for a single aux mention slot. */
    setAuxValue(state, action: PayloadAction<{ id: string; value: string }>) {
      state.auxValues[action.payload.id] = action.payload.value;
    },

    // --- ProgChooser (runtime only — not persisted) ---

    /** Adds or removes a progCodeId from the selected list. */
    toggleProgChooserProgCode(state, action: PayloadAction<string>) {
      const ids = state.progChooser.selectedProgCodeIds;
      const idx = ids.indexOf(action.payload);
      if (idx === -1) {
        ids.push(action.payload);
      } else {
        ids.splice(idx, 1);
      }
    },

    /** Resets all progChooser runtime state to its initial empty values. */
    clearProgChooserSelections(state) {
      state.progChooser = INITIAL_PROG_CHOOSER;
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
        prepayId: null,
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

    /** Sets (or clears) the prepay code for a given program config (by alias). */
    setPrepayId(
      state,
      action: PayloadAction<{ alias: string; prepayId: string | null }>,
    ) {
      const config = state.programConfigs.find(
        (c) => c.alias === action.payload.alias,
      );
      if (config) {
        config.prepayId = action.payload.prepayId;
      }
    },

    // --- Loaded template state ---

    /** Loads a stored template into the editor. Replaces sections + programConfigs. */
    loadTemplate(state, action: PayloadAction<StoredTemplateDoc>) {
      const template = action.payload;
      state.sections = template.sections.length > 0
        ? template.sections
        : [makeSection(INITIAL_SECTION_ID)];
      state.activeSectionId = state.sections[0].sectionId;
      state.programConfigs = template.programConfigs;
      state.auxValues = {};
      state.progChooser = INITIAL_PROG_CHOOSER;
      state.loadedTemplateId = template.templateId;
      state.loadedTemplateSaId = template.saId;
      state.loadedTemplateName = template.name;
      state.loadedTemplateGroupId = template.groupId;
    },

    /**
     * Resets the editor to a blank state (new template).
     * Clears all sections, programConfigs, and loaded template metadata.
     */
    clearTemplate(state) {
      state.sections = [makeSection(INITIAL_SECTION_ID)];
      state.activeSectionId = INITIAL_SECTION_ID;
      state.programConfigs = [];
      state.auxValues = {};
      state.progChooser = INITIAL_PROG_CHOOSER;
      state.loadedTemplateId = null;
      state.loadedTemplateSaId = null;
      state.loadedTemplateName = null;
      state.loadedTemplateGroupId = null;
    },
  },
});

export const quickSendActions = quickSendSlice.actions;
export default quickSendSlice.reducer;
