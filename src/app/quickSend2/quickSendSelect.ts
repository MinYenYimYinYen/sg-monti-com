import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type {
  ProgramConfig,
  ProgramVariables,
  ProgramAggregates,
  ProgLeafKey,
  Section,
} from "./QuickSendTypes";
import { computeProgramPricing } from "./lib/programPricing";

// ---------------------------------------------------------------------------
// Slice root
// ---------------------------------------------------------------------------

const selectSlice = (state: AppState) => state.quickSend2;

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
        prepayId: "prepayId" in override ? (override.prepayId ?? null) : config.prepayId,
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

      // Resolve prepay: per-program prepayId takes priority over global.
      const effectivePrepayId = config.prepayId ?? globalPrepayId;
      const prepayDoc = effectivePrepayId != null ? prepayDocMap.get(effectivePrepayId) : undefined;
      const prepayPercent = prepayDoc?.percent ?? null;

      if (!progCode) {
        return {
          progCodeId: config.progCodeId,
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
          servTable: [],
        };
      }

      return computeProgramPricing({
        progCode,
        includedServCodeIds: config.includedServCodeIds,
        size,
        effectiveTaxRate,
        prepayPercent,
        priceOverride: config.priceOverride,
      });
    });
  },
);

const selectProgramVariableMap = createSelector(
  [selectProgramVariables],
  (vars): Map<string, ProgramVariables> => new Map(vars.map((v) => [v.progCodeId, v])),
);

const selectAggregates = createSelector(
  [selectProgramVariables],
  (vars): ProgramAggregates => {
    if (vars.length === 0) {
      return { subTotal: null, prepayDiscAmt: null, taxAmt: null, total: null };
    }

    let subTotal: number | null = null;
    let prepayDiscAmt: number | null = null;
    let taxAmt: number | null = null;
    let total: number | null = null;

    for (const v of vars) {
      if (v.subTotal !== null) subTotal = (subTotal ?? 0) + v.subTotal;
      if (v.prepayDiscAmt !== null) prepayDiscAmt = (prepayDiscAmt ?? 0) + v.prepayDiscAmt;
      if (v.taxAmt !== null) taxAmt = (taxAmt ?? 0) + v.taxAmt;
      if (v.total !== null) total = (total ?? 0) + v.total;
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

/**
 * Returns the set of progCodeIds that are directly referenced by name in the
 * template HTML (i.e. `@{progCodeId}.{prop}` mentions). These programs are
 * "pinned" — the remove button in the program panel is disabled for them.
 *
 * Programs only referenced via `@loop.*` are not pinned.
 */
const selectPinnedProgCodeIds = createSelector(
  [selectAllSectionsHtml, selectProgramConfigs],
  (html, configs): Set<string> => {
    const pinned = new Set<string>();
    // Match data-id="{something}.{prop}" where {something} is not "loop" or "totals"
    const matches = html.matchAll(/data-id="([^"]+)\.[^"]+"/g);
    const configIds = new Set(configs.map((c) => c.progCodeId));
    for (const match of matches) {
      const prefix = match[1];
      if (prefix !== "loop" && prefix !== "totals" && configIds.has(prefix)) {
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
// Phase 4 — preview resolver
// ---------------------------------------------------------------------------

const UNFULFILLED_MARK = `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">`;

function escapeReplacement(str: string): string {
  return str.replace(/\$/g, "$$$$");
}

function resolveProgMention(
  fullMatch: string,
  prop: string,
  vars: ProgramVariables,
  mentionPrefix: string,
): string {
  const mentionId = `${mentionPrefix}.${prop}`;

  if (prop === "prepayPercent") {
    const value = vars.prepayPercent;
    if (value === null || value === undefined) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
    const displayValue = escapeReplacement(`${value}%`);
    return fullMatch
      .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
      .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
  }

  if (prop === "servTable") {
    if (vars.servTable.length === 0) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
    const rows = vars.servTable
      .map((row) => {
        const priceCell = row.price !== null ? `$${row.price.toFixed(2)}` : "—";
        return `<tr><td>${row.description}</td><td>${priceCell}</td></tr>`;
      })
      .join("");
    return `<table><tbody>${rows}</tbody></table>`;
  }

  const typedProp = prop as ProgLeafKey;
  const value = vars[typedProp];
  if (value === null || value === undefined) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;

  const isDollarAmount =
    (typedProp.toLowerCase().includes("price") ||
      typedProp.toLowerCase().includes("amt") ||
      typedProp === "subTotal" ||
      typedProp === "total") &&
    typeof value === "number";
  const displayValue = escapeReplacement(
    isDollarAmount ? `$${(value as number).toFixed(2)}` : String(value),
  );

  return fullMatch
    .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
    .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
}

const LOOP_MENTION_RE = /data-id="loop\.[^"]*"/;

/**
 * Resolves the `@loop.*` loop in the given HTML using pre-computed program variables.
 *
 * Any `<p>` or `<tr>` containing a `@loop.*` mention is cloned once per selected
 * program. The same table/non-table split strategy as v1 is used to prevent the
 * paragraph regex from re-processing rows already expanded by the table regex.
 */
function resolveLoopMentions(html: string, allProgVars: ProgramVariables[]): string {
  const TR_LOOP_RE = /(<tr(?:\s[^>]*)?>)((?:(?!<\/tr>)[\s\S])*?data-id="loop\.[^"]*"(?:(?!<\/tr>)[\s\S])*?)(<\/tr>)/g;
  const P_LOOP_RE = /(<p(?:\s[^>]*)?>)((?:(?!<\/p>)[\s\S])*?data-id="loop\.[^"]*"(?:(?!<\/p>)[\s\S])*?)(<\/p>)/g;

  if (allProgVars.length === 0) {
    let result = html.replace(TR_LOOP_RE, () =>
      `<tr><td>${UNFULFILLED_MARK}{{no programs selected}}</mark></td></tr>`,
    );
    result = result.replace(P_LOOP_RE, () =>
      `<p>${UNFULFILLED_MARK}{{no programs selected}}</mark></p>`,
    );
    return result;
  }

  const expandLoopUnit = (open: string, inner: string, close: string): string =>
    allProgVars
      .map((vars) => {
        const resolvedInner = inner.replace(
          /<span[^>]*data-type="mention"[^>]*data-id="loop\.([^"]+)"[^>]*>[^<]*<\/span>/g,
          (fullMatch, prop: string) => resolveProgMention(fullMatch, prop, vars, "loop"),
        );
        return `${open}${resolvedInner}${close}`;
      })
      .join("");

  const TABLE_SPLIT_RE = /(<table[\s\S]*?<\/table>)/g;
  return html
    .split(TABLE_SPLIT_RE)
    .map((segment) => {
      if (segment.startsWith("<table")) {
        return segment.replace(TR_LOOP_RE, (_, open, inner, close) =>
          expandLoopUnit(open, inner, close),
        );
      }
      if (LOOP_MENTION_RE.test(segment)) {
        return segment.replace(P_LOOP_RE, (_, open, inner, close) =>
          expandLoopUnit(open, inner, close),
        );
      }
      return segment;
    })
    .join("");
}

/**
 * Resolves `@totals.{prop}` mention spans to their summed dollar values.
 */
function resolveTotalsMentions(html: string, aggregates: ProgramAggregates): string {
  return html.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="totals\.(subTotal|prepayDiscAmt|taxAmt|total)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prop: string) => {
      const mentionId = `totals.${prop}`;
      const value = aggregates[prop as keyof ProgramAggregates];
      if (value === null) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
      const displayValue = escapeReplacement(`$${value.toFixed(2)}`);
      return fullMatch
        .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
        .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
    },
  );
}

/**
 * Full mention-to-value replacement pipeline for a single section's HTML.
 *
 * Resolution order:
 * 1. Flat vars (@name, @size, @taxRate, @season, @sgBillpayInfo, @aux.*)
 * 2. Program-specific mentions (@{progCodeId}.{prop})
 * 3. Loop expansion (@loop.*)
 * 4. Aggregate mentions (@totals.{prop})
 */
function resolveHtml(
  html: string,
  name: string,
  size: string,
  taxRate: string | null,
  season: string | null,
  progVarMap: Map<string, ProgramVariables>,
  customer: Customer | null,
  auxValues: Record<string, string>,
  progVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): string {
  let preview = html;

  // --- Flat vars ---

  if (name) {
    const safeName = escapeReplacement(name);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeName}"$3${safeName}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{name}}</mark>`,
    );
  }

  if (size) {
    const safeSize = escapeReplacement(size);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeSize}"$3${safeSize}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{size}}</mark>`,
    );
  }

  if (taxRate) {
    const safeTaxRate = escapeReplacement(taxRate);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeTaxRate}"$3${safeTaxRate}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{taxRate}}</mark>`,
    );
  }

  if (season) {
    const safeSeason = escapeReplacement(season);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safeSeason}"$3${safeSeason}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{season}}</mark>`,
    );
  }

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="sgBillpayInfo"[^>]*>[^<]*<\/span>/g,
    () => {
      if (!customer) return `${UNFULFILLED_MARK}{{sgBillpayInfo}}</mark>`;
      const rows = [
        `<tr><td>Account Number:</td><td>${customer.custId}</td></tr>`,
        `<tr><td>Last Name:</td><td>${customer.lastName}</td></tr>`,
        `<tr><td>Zip Code:</td><td>${customer.address.zip ?? ""}</td></tr>`,
      ].join("");
      return `<table><tbody>${rows}</tbody></table>`;
    },
  );

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="(aux(?:_\d+)?)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, auxId: string) => {
      const value = auxValues[auxId];
      if (!value) return `${UNFULFILLED_MARK}{{${auxId}}}</mark>`;
      const safeValue = escapeReplacement(value);
      return fullMatch
        .replace(/data-label="[^"]*"/, `data-label="${safeValue}"`)
        .replace(/>([^<]*)<\/span>$/, `>${safeValue}</span>`);
    },
  );

  // --- Program-specific mentions: @{progCodeId}.{prop} ---
  // Match any data-id that contains a dot and is not loop.* or totals.*
  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)\.([^"]+)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prefix: string, prop: string) => {
      if (prefix === "loop" || prefix === "totals") return fullMatch;
      const vars = progVarMap.get(prefix);
      if (!vars) return `${UNFULFILLED_MARK}{{${prefix}.${prop}}}</mark>`;
      return resolveProgMention(fullMatch, prop, vars, prefix);
    },
  );

  // --- Loop expansion ---
  preview = resolveLoopMentions(preview, progVars);

  // --- Aggregate totals ---
  preview = resolveTotalsMentions(preview, aggregates);

  return preview;
}

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
    selectProgramVariables,
    selectProgramVariableMap,
    selectCustomerState,
    selectAuxValues,
    selectAggregates,
  ],
  (html, name, size, effectiveTaxRate, season, progVars, progVarMap, customerState, auxValues, aggregates): string => {
    if (!html) return "";
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const seasonStr = season != null ? String(season) : null;
    return resolveHtml(
      html,
      name,
      size,
      taxRateStr,
      seasonStr,
      progVarMap,
      customerState.customer,
      auxValues,
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
    selectProgramVariables,
    selectProgramVariableMap,
    selectCustomerState,
    selectAuxValues,
    selectAggregates,
  ],
  (sections, name, size, effectiveTaxRate, season, progVars, progVarMap, customerState, auxValues, aggregates): { sectionId: string; previewHtml: string }[] => {
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const seasonStr = season != null ? String(season) : null;
    return sections.map((section) => {
      if (!section.templateHtml) return { sectionId: section.sectionId, previewHtml: "" };
      return {
        sectionId: section.sectionId,
        previewHtml: resolveHtml(
          section.templateHtml,
          name,
          size,
          taxRateStr,
          seasonStr,
          progVarMap,
          customerState.customer,
          auxValues,
          progVars,
          aggregates,
        ),
      };
    });
  },
);

// ---------------------------------------------------------------------------
// Resolved flat variables (for PreviewEditor in-place label updates)
// ---------------------------------------------------------------------------

const selectResolvedVariables = createSelector(
  [selectNameOverride, selectSizeOverride, selectEffectiveTaxRate, globalSettingsSelect.season],
  (name, size, taxRate, season): Partial<Record<string, string>> => ({
    name: name || undefined,
    size: size || undefined,
    taxRate: taxRate != null ? `${taxRate.toFixed(3)}%` : undefined,
    season: season != null ? String(season) : undefined,
  }),
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Selector<T> = (state: any) => T;

export const qs2Select: {
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
  activeAuxIds: Selector<string[]>;
  programVariables: Selector<ProgramVariables[]>;
  programVariableMap: Selector<Map<string, ProgramVariables>>;
  aggregates: Selector<ProgramAggregates>;
  pinnedProgCodeIds: Selector<Set<string>>;
  resolvedVariables: Selector<Partial<Record<string, string>>>;
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
  activeAuxIds: selectActiveAuxIds,
  programVariables: selectProgramVariables,
  programVariableMap: selectProgramVariableMap,
  aggregates: selectAggregates,
  pinnedProgCodeIds: selectPinnedProgCodeIds,
  resolvedVariables: selectResolvedVariables,
  previewHtml: selectPreviewHtml,
  allPreviewHtmls: selectAllPreviewHtmls,
  loadedTemplateId: selectLoadedTemplateId,
  loadedTemplateSaId: selectLoadedTemplateSaId,
  loadedTemplateName: selectLoadedTemplateName,
  loadedTemplateGroupId: selectLoadedTemplateGroupId,
};
