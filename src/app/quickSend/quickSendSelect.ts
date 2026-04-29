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
  ProgLeafKey,
  LoopLeafKey,
  Section,
} from "./QuickSendTypes";
import { computeProgramPricing } from "./lib/programPricing";

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
    if (vars.length === 0) {
      return { subTotal: null, prepayDiscAmt: null, taxAmt: null, total: null };
    }

    let subTotal: number | null = null;
    let taxAmt: number | null = null;
    let total: number | null = null;

    for (const v of vars) {
      if (v.subTotal !== null) subTotal = (subTotal ?? 0) + v.subTotal;
      if (v.taxAmt !== null) taxAmt = (taxAmt ?? 0) + v.taxAmt;
      if (v.total !== null) total = (total ?? 0) + v.total;
    }

    // prepayDiscAmt is null when no prepay is selected — renders as unfulfilled in preview.
    let prepayDiscAmt: number | null = null;
    if (effectivePrepayPercent !== null) {
      for (const v of vars) {
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

/**
 * Returns the set of progCodeIds that are directly referenced by name in the
 * template HTML (i.e. `@{progCodeId}.{prop}` mentions). These programs are
 * "pinned" — the remove button in the program panel is disabled for them.
 *
 * Programs only referenced via `@loop.*` are not pinned.
 */
/** Installment-only program variables — used by `@installment.*` loop expansion. */
const selectInstallmentProgramVariables = createSelector(
  [selectProgramVariables],
  (vars): ProgramVariables[] => vars.filter((v) => v.isInstallment),
);

const selectPinnedProgCodeIds = createSelector(
  [selectAllSectionsHtml, selectProgramConfigs],
  (html, configs): Set<string> => {
    const pinned = new Set<string>();
    // Match data-id="{something}.{prop}" where {something} is not "loop", "installment", or "totals"
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

  const typedProp = prop as ProgLeafKey | LoopLeafKey;
  const value = (vars as Record<string, unknown>)[typedProp];
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

// ---------------------------------------------------------------------------
// Pre-pass: drop entire outermost block elements that contain optional-namespace
// mentions whose data is null. This prevents orphaned static text like
// "Prepay Amount: saves" when the mention values are unavailable.
//
// "Optional" namespaces: loop.*, installment.*, totals.*
// "Outermost block" = top-level <p>, <table>, <ul>, <ol>, <blockquote>, <h1>–<h6>
// ---------------------------------------------------------------------------

const OPTIONAL_MENTION_RE = /data-id="(loop|installment|totals)\.[^"]*"/;

/**
 * Returns `true` if the segment should be dropped (contains an optional-namespace
 * mention whose data is null).
 */
function shouldDropSegment(
  segment: string,
  allProgVars: ProgramVariables[],
  installmentVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): boolean {
  if (!OPTIONAL_MENTION_RE.test(segment)) return false;
  if (/data-id="loop\.[^"]*"/.test(segment) && allProgVars.length === 0) return true;
  if (/data-id="installment\.[^"]*"/.test(segment) && installmentVars.length === 0) return true;
  const totalsMatches = [...segment.matchAll(/data-id="totals\.(subTotal|prepayDiscAmt|taxAmt|total)"/g)];
  for (const m of totalsMatches) {
    const field = m[1] as keyof ProgramAggregates;
    if (aggregates[field] === null) return true;
  }
  return false;
}

/**
 * Drops entire outermost block elements that contain optional-namespace mentions
 * whose data is null. Uses the same table/non-table split strategy as `resolveLoopLike`
 * to correctly handle `<table>` blocks that contain nested `<p>` or other tags.
 *
 * - `loop.*` → drop when `allProgVars` is empty
 * - `installment.*` → drop when `installmentVars` is empty
 * - `totals.*` → drop when any referenced aggregate field is null
 */
function dropNullOptionalBlocks(
  html: string,
  allProgVars: ProgramVariables[],
  installmentVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): string {
  const TABLE_SPLIT_RE = /(<table[\s\S]*?<\/table>)/g;
  const P_BLOCK_RE = /(<(?:p|ul|ol|blockquote|h[1-6])(?:\s[^>]*)?>[\s\S]*?<\/(?:p|ul|ol|blockquote|h[1-6])>)/g;

  return html
    .split(TABLE_SPLIT_RE)
    .map((segment) => {
      if (segment.startsWith("<table")) {
        // Whole table: drop if any optional mention inside has null data.
        return shouldDropSegment(segment, allProgVars, installmentVars, aggregates) ? "" : segment;
      }
      // Non-table segment: check each paragraph-level block individually.
      return segment.replace(P_BLOCK_RE, (block) =>
        shouldDropSegment(block, allProgVars, installmentVars, aggregates) ? "" : block,
      );
    })
    .join("");
}

/**
 * Generic loop expander used by both `@loop.*` and `@installment.*`.
 *
 * By the time this runs, `dropNullOptionalBlocks` has already removed any
 * block where `filteredVars` would be empty, so this function can assume
 * `filteredVars.length > 0`.
 */
function resolveLoopLike(
  html: string,
  filteredVars: ProgramVariables[],
  namespace: string,
): string {
  const trRe = new RegExp(
    `(<tr(?:\\s[^>]*)?>)((?:(?!<\\/tr>)[\\s\\S])*?data-id="${namespace}\\.[^"]*"(?:(?!<\\/tr>)[\\s\\S])*?)(<\\/tr>)`,
    "g",
  );
  const pRe = new RegExp(
    `(<p(?:\\s[^>]*)?>)((?:(?!<\\/p>)[\\s\\S])*?data-id="${namespace}\\.[^"]*"(?:(?!<\\/p>)[\\s\\S])*?)(<\\/p>)`,
    "g",
  );
  const mentionRe = new RegExp(
    `<span[^>]*data-type="mention"[^>]*data-id="${namespace}\\.([^"]+)"[^>]*>[^<]*<\\/span>`,
    "g",
  );
  const hasMentionRe = new RegExp(`data-id="${namespace}\\.[^"]*"`);

  const expandUnit = (open: string, inner: string, close: string, isTableRow: boolean): string => {
    const resolvedInners = filteredVars.map((vars) =>
      inner.replace(mentionRe, (fullMatch, prop: string) =>
        resolveProgMention(fullMatch, prop, vars, namespace),
      ),
    );
    if (isTableRow) {
      return resolvedInners.map((resolvedInner) => `${open}${resolvedInner}${close}`).join("");
    }
    return `${open}${resolvedInners.join("<br>")}${close}`;
  };

  const TABLE_SPLIT_RE = /(<table[\s\S]*?<\/table>)/g;
  return html
    .split(TABLE_SPLIT_RE)
    .map((segment) => {
      if (segment.startsWith("<table")) {
        return segment.replace(trRe, (_, open, inner, close) =>
          expandUnit(open, inner, close, true),
        );
      }
      if (hasMentionRe.test(segment)) {
        return segment.replace(pRe, (_, open, inner, close) =>
          expandUnit(open, inner, close, false),
        );
      }
      return segment;
    })
    .join("");
}

/** Resolves `@loop.*` mentions — iterates all selected programs. */
function resolveLoopMentions(html: string, allProgVars: ProgramVariables[]): string {
  return resolveLoopLike(html, allProgVars, "loop");
}

/** Resolves `@installment.*` mentions — iterates installment programs only. */
function resolveInstallmentMentions(html: string, installmentVars: ProgramVariables[]): string {
  return resolveLoopLike(html, installmentVars, "installment");
}

/**
 * Resolves `@totals.{prop}` mention spans to their summed dollar values.
 * By the time this runs, `dropNullOptionalBlocks` has already removed any
 * block where a totals value is null, so all values here are non-null.
 */
function resolveTotalsMentions(html: string, aggregates: ProgramAggregates): string {
  return html.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="totals\.(subTotal|prepayDiscAmt|taxAmt|total)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prop: string) => {
      const value = aggregates[prop as keyof ProgramAggregates];
      if (value === null) return fullMatch; // should not happen after pre-pass
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
 * 1. Flat vars (@name, @size, @taxRate, @season, @sgBillpayInfo, @prepayPercent, @aux.*)
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
  prepayPercent: number | null,
  progVarMap: Map<string, ProgramVariables>,
  customer: Customer | null,
  auxValues: Record<string, string>,
  progVars: ProgramVariables[],
  aggregates: ProgramAggregates,
): string {
  // Pre-pass: drop entire block elements whose optional mentions have no data.
  const installmentVars = progVars.filter((v) => v.isInstallment);
  let preview = dropNullOptionalBlocks(html, progVars, installmentVars, aggregates);

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

  if (prepayPercent !== null) {
    const safePrepay = escapeReplacement(`${prepayPercent}%`);
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="prepayPercent"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${safePrepay}"$3${safePrepay}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="prepayPercent"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{prepayPercent}}</mark>`,
    );
  }

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
  // Match any data-id that contains a dot and is not loop.*, installment.*, or totals.*
  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)\.([^"]+)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, prefix: string, prop: string) => {
      if (prefix === "loop" || prefix === "installment" || prefix === "totals") return fullMatch;
      const vars = progVarMap.get(prefix);
      if (!vars) return `${UNFULFILLED_MARK}{{${prefix}.${prop}}}</mark>`;
      return resolveProgMention(fullMatch, prop, vars, prefix);
    },
  );

  // --- Loop expansion (@loop.*) — non-installment programs only ---
  const nonInstallmentVars = progVars.filter((v) => !v.isInstallment);
  preview = resolveLoopMentions(preview, nonInstallmentVars);

  // --- Installment loop expansion (@installment.*) ---
  preview = resolveInstallmentMentions(preview, installmentVars);

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
    selectEffectivePrepayPercent,
    selectProgramVariables,
    selectProgramVariableMap,
    selectCustomerState,
    selectAuxValues,
    selectAggregates,
  ],
  (html, name, size, effectiveTaxRate, season, prepayPercent, progVars, progVarMap, customerState, auxValues, aggregates): string => {
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
    selectAggregates,
  ],
  (sections, name, size, effectiveTaxRate, season, prepayPercent, progVars, progVarMap, customerState, auxValues, aggregates): { sectionId: string; previewHtml: string }[] => {
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
