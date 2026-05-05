import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type {
  ProgramConfig,
  ProgramVariables,
  ProgramAggregates,
  Section,
} from "./QuickSendTypes";
import { computeProgramPricing } from "./lib/programPricing";
import { resolveHtml } from "./lib/resolveHtml";

// ---------------------------------------------------------------------------
// Slice root
// ---------------------------------------------------------------------------

const selectSlice = (state: AppState) => state.quickSend;

// ---------------------------------------------------------------------------
// Phase 1 — basic slice selectors
// ---------------------------------------------------------------------------

const selectSections = createSelector([selectSlice], (s) => s.sections);
const selectActiveSectionId = createSelector([selectSlice], (s) => s.activeSectionId);
const selectActiveSection = createSelector(
  [selectSections, selectActiveSectionId],
  (sections, id): Section => sections.find((s) => s.sectionId === id) ?? sections[0],
);
const selectTemplateHtml = createSelector([selectActiveSection], (s) => s.templateHtml);

const selectProgramConfigs = createSelector([selectSlice], (s) => s.programConfigs);
const selectRuntimeOverrides = createSelector([selectSlice], (s) => s.runtimeOverrides);
const selectGlobalPrepayId = createSelector([selectSlice], (s) => s.globalPrepayId);
const selectAuxValues = createSelector([selectSlice], (s) => s.auxValues);
const selectAuxPurposes = createSelector([selectSlice], (s) => s.auxPurposes);
const selectCustomerState = createSelector([selectSlice], (s) => s.customer);
const selectNameOverride = createSelector([selectCustomerState], (c) => c.nameOverride);
const selectSizeOverride = createSelector([selectCustomerState], (c) => c.sizeOverride);
const selectTaxRateZipOverride = createSelector([selectCustomerState], (c) => c.taxRateZipOverride);

const selectLoadedTemplateId = createSelector([selectSlice], (s) => s.loadedTemplateId);
const selectLoadedTemplateSaId = createSelector([selectSlice], (s) => s.loadedTemplateSaId);
const selectLoadedTemplateName = createSelector([selectSlice], (s) => s.loadedTemplateName);
const selectLoadedTemplateGroupId = createSelector([selectSlice], (s) => s.loadedTemplateGroupId);

const selectEffectiveTaxRate = createSelector(
  [selectCustomerState, zipCodeSelect.zipCodeMap],
  (customerState, zipCodeMap): number | null => {
    if (customerState.taxRateZipOverride != null) {
      return zipCodeMap.get(customerState.taxRateZipOverride)?.taxRate ?? null;
    }
    return customerState.customer?.taxRate ?? null;
  },
);

const selectSizeNum = createSelector([selectSizeOverride], (size): number | null => {
  const n = parseFloat(size);
  return !isNaN(n) && n > 0 ? n : null;
});

// ---------------------------------------------------------------------------
// Phase 1 — effective program configs (persisted + runtime overrides merged)
// ---------------------------------------------------------------------------

const selectEffectiveProgramConfigs = createSelector(
  [selectProgramConfigs, selectRuntimeOverrides],
  (configs, overrides): ProgramConfig[] =>
    configs.map((config) => {
      const override = overrides.programConfigs[config.progCodeId];
      if (!override) return config;
      return {
        progCodeId: config.progCodeId,
        includedServCodeIds: override.includedServCodeIds ?? config.includedServCodeIds,
        priceOverride: "priceOverride" in override ? (override.priceOverride ?? null) : config.priceOverride,
      };
    }),
);

const selectEffectiveGlobalPrepayId = createSelector(
  [selectGlobalPrepayId, selectRuntimeOverrides],
  (persisted, overrides): string | null => {
    if (overrides.globalPrepayId !== undefined) return overrides.globalPrepayId;
    return persisted;
  },
);

/** The effective global prepay percentage (0–100), or null if no prepay is selected. */
const selectEffectivePrepayPercent = createSelector(
  [selectEffectiveGlobalPrepayId, prepaySelect.prepayDocMap],
  (prepayId, prepayDocMap): number | null => {
    if (prepayId == null) return null;
    return prepayDocMap.get(prepayId)?.percent ?? null;
  },
);

// ---------------------------------------------------------------------------
// Phase 2 — pricing selectors
// ---------------------------------------------------------------------------

const selectProgramVariables = createSelector(
  [
    selectEffectiveProgramConfigs,
    progServSelect.progCodeMap,
    selectSizeNum,
    prepaySelect.prepayDocMap,
    selectEffectiveTaxRate,
    selectEffectiveGlobalPrepayId,
  ],
  (configs, progCodeMap, sizeNum, prepayDocMap, effectiveTaxRate, globalPrepayId): ProgramVariables[] => {
    const size = sizeNum ?? 0;

    return configs.map((config) => {
      const progCode = progCodeMap.get(config.progCodeId);

      // Resolve prepay from global prepay only.
      const prepayDoc = globalPrepayId != null ? prepayDocMap.get(globalPrepayId) : undefined;
      const prepayPercent = prepayDoc?.percent ?? null;

      if (!progCode) {
        return {
          progCodeId: config.progCodeId,
          isInstallment: false,
          description: config.progCodeId,
          servCount: config.includedServCodeIds.length,
          prefPrice: null,
          econPrice: null,
          servPrice: null,
          subTotal: null,
          prepayPercent,
          prepayDiscAmt: null,
          taxAmt: null,
          total: null,
          monthPrice: null,
          servTable: [],
        };
      }

      const result = computeProgramPricing({
        progCode,
        includedServCodeIds: config.includedServCodeIds,
        size,
        effectiveTaxRate,
        prepayPercent,
        priceOverride: config.priceOverride,
        isInstallment: progCode.isInstallment,
      });
      return result;
    });
  },
);

const selectProgramVariableMap = createSelector(
  [selectProgramVariables],
  (vars): Map<string, ProgramVariables> => new Map(vars.map((v) => [v.progCodeId, v])),
);

const selectAggregates = createSelector(
  [selectProgramVariables, selectEffectivePrepayPercent],
  (vars, effectivePrepayPercent): ProgramAggregates => {
    // Installment programs are fully excluded from all aggregate totals.
    // @totals.* reflects only regular (non-installment) programs.
    const regularVars = vars.filter((v) => !v.isInstallment);

    if (regularVars.length === 0) {
      return { subTotal: null, prepayDiscAmt: null, taxAmt: null, total: null };
    }

    let subTotal: number | null = null;
    let taxAmt: number | null = null;
    let total: number | null = null;

    for (const v of regularVars) {
      if (v.subTotal !== null) subTotal = (subTotal ?? 0) + v.subTotal;
      if (v.taxAmt !== null) taxAmt = (taxAmt ?? 0) + v.taxAmt;
      if (v.total !== null) total = (total ?? 0) + v.total;
    }

    // prepayDiscAmt is null when no prepay is selected — renders as unfulfilled in preview.
    let prepayDiscAmt: number | null = null;
    if (effectivePrepayPercent !== null) {
      for (const v of regularVars) {
        if (v.prepayDiscAmt !== null) prepayDiscAmt = (prepayDiscAmt ?? 0) + v.prepayDiscAmt;
      }
    }

    return { subTotal, prepayDiscAmt, taxAmt, total };
  },
);

// ---------------------------------------------------------------------------
// Phase 3 — template scanning selectors
// ---------------------------------------------------------------------------

const selectAllSectionsHtml = createSelector(
  [selectSections],
  (sections) => sections.map((s) => s.templateHtml).join(" "),
);

/** Installment-only program variables — used by `@installment.*` loop expansion. */
const selectInstallmentProgramVariables = createSelector(
  [selectProgramVariables],
  (vars): ProgramVariables[] => vars.filter((v) => v.isInstallment),
);

const selectPinnedProgCodeIds = createSelector(
  [selectAllSectionsHtml, selectProgramConfigs],
  (html, configs): Set<string> => {
    const pinned = new Set<string>();
    const matches = html.matchAll(/data-id="([^"]+)\.[^"]+"/g);
    const configIds = new Set(configs.map((c) => c.progCodeId));
    for (const match of matches) {
      const prefix = match[1];
      if (prefix !== "loop" && prefix !== "installment" && prefix !== "totals" && configIds.has(prefix)) {
        pinned.add(prefix);
      }
    }
    return pinned;
  },
);

/**
 * Parses ALL sections' HTML for aux mention IDs (`aux`, `aux_2`, …) and returns
 * them sorted in ascending order.
 */
const selectActiveAuxIds = createSelector(
  [selectAllSectionsHtml],
  (html): string[] => {
    const ids = new Set<string>();
    const matches = html.matchAll(/data-id="(aux(?:_\d+)?)"/g);
    for (const match of matches) {
      ids.add(match[1]);
    }
    return [...ids].sort((a, b) => {
      const numA = a === "aux" ? 1 : parseInt(a.slice(4), 10);
      const numB = b === "aux" ? 1 : parseInt(b.slice(4), 10);
      return numA - numB;
    });
  },
);

// ---------------------------------------------------------------------------
// Preview selectors
// ---------------------------------------------------------------------------

const selectPreviewHtml = createSelector(
  [
    selectTemplateHtml,
    selectNameOverride,
    selectSizeOverride,
    selectEffectiveTaxRate,
    globalSettingsSelect.season,
    selectEffectivePrepayPercent,
    selectProgramVariables,
    selectProgramVariableMap,
    selectCustomerState,
    selectAuxValues,
    selectAuxPurposes,
    selectAggregates,
  ],
  (html, name, size, effectiveTaxRate, season, prepayPercent, progVars, progVarMap, customerState, auxValues, auxPurposes, aggregates): string => {
    if (!html) return "";
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const seasonStr = season != null ? String(season) : null;
    return resolveHtml(
      html,
      name,
      size,
      taxRateStr,
      seasonStr,
      prepayPercent,
      progVarMap,
      customerState.customer,
      auxValues,
      auxPurposes,
      progVars,
      aggregates,
    );
  },
);

const selectAllPreviewHtmls = createSelector(
  [
    selectSections,
    selectNameOverride,
    selectSizeOverride,
    selectEffectiveTaxRate,
    globalSettingsSelect.season,
    selectEffectivePrepayPercent,
    selectProgramVariables,
    selectProgramVariableMap,
    selectCustomerState,
    selectAuxValues,
    selectAuxPurposes,
    selectAggregates,
  ],
  (sections, name, size, effectiveTaxRate, season, prepayPercent, progVars, progVarMap, customerState, auxValues, auxPurposes, aggregates): { sectionId: string; previewHtml: string }[] => {
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const seasonStr = season != null ? String(season) : null;
    return sections.map((section: Section) => {
      if (!section.templateHtml) return { sectionId: section.sectionId, previewHtml: "" };
      return {
        sectionId: section.sectionId,
        previewHtml: resolveHtml(
          section.templateHtml,
          name,
          size,
          taxRateStr,
          seasonStr,
          prepayPercent,
          progVarMap,
          customerState.customer,
          auxValues,
          auxPurposes,
          progVars,
          aggregates,
        ),
      };
    });
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Selector<T> = (state: any) => T;

export const qsSelect: {
  sections: Selector<ReturnType<typeof selectSections>>;
  activeSectionId: Selector<string>;
  activeSection: Selector<Section>;
  templateHtml: Selector<string>;
  customerState: Selector<ReturnType<typeof selectCustomerState>>;
  nameOverride: Selector<string>;
  sizeOverride: Selector<string>;
  taxRateZipOverride: Selector<string | null>;
  effectiveTaxRate: Selector<number | null>;
  sizeNum: Selector<number | null>;
  programConfigs: Selector<ProgramConfig[]>;
  effectiveProgramConfigs: Selector<ProgramConfig[]>;
  effectiveGlobalPrepayId: Selector<string | null>;
  auxValues: Selector<Record<string, string>>;
  auxPurposes: Selector<Record<string, string>>;
  activeAuxIds: Selector<string[]>;
  programVariables: Selector<ProgramVariables[]>;
  installmentProgramVariables: Selector<ProgramVariables[]>;
  programVariableMap: Selector<Map<string, ProgramVariables>>;
  aggregates: Selector<ProgramAggregates>;
  pinnedProgCodeIds: Selector<Set<string>>;
  previewHtml: Selector<string>;
  allPreviewHtmls: Selector<{ sectionId: string; previewHtml: string }[]>;
  loadedTemplateId: Selector<string | null>;
  loadedTemplateSaId: Selector<string | null>;
  loadedTemplateName: Selector<string | null>;
  loadedTemplateGroupId: Selector<string | null>;
} = {
  sections: selectSections,
  activeSectionId: selectActiveSectionId,
  activeSection: selectActiveSection,
  templateHtml: selectTemplateHtml,
  customerState: selectCustomerState,
  nameOverride: selectNameOverride,
  sizeOverride: selectSizeOverride,
  taxRateZipOverride: selectTaxRateZipOverride,
  effectiveTaxRate: selectEffectiveTaxRate,
  sizeNum: selectSizeNum,
  programConfigs: selectProgramConfigs,
  effectiveProgramConfigs: selectEffectiveProgramConfigs,
  effectiveGlobalPrepayId: selectEffectiveGlobalPrepayId,
  auxValues: selectAuxValues,
  auxPurposes: selectAuxPurposes,
  activeAuxIds: selectActiveAuxIds,
  programVariables: selectProgramVariables,
  installmentProgramVariables: selectInstallmentProgramVariables,
  programVariableMap: selectProgramVariableMap,
  aggregates: selectAggregates,
  pinnedProgCodeIds: selectPinnedProgCodeIds,
  previewHtml: selectPreviewHtml,
  allPreviewHtmls: selectAllPreviewHtmls,
  loadedTemplateId: selectLoadedTemplateId,
  loadedTemplateSaId: selectLoadedTemplateSaId,
  loadedTemplateName: selectLoadedTemplateName,
  loadedTemplateGroupId: selectLoadedTemplateGroupId,
};
