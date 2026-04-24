import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { prepaySelect } from "@/app/realGreen/prepay/selectors/prepaySelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type {
  QSVariableKey,
  QSProgramConfig,
  QSSection,
  TemplateControlId,
  QSProgramVariables,
  QSProgLeafKey,
} from "./QuickSendTypes";

const selectSlice = (state: AppState) => state.quickSend;

const selectLoadedTemplateId = (state: AppState) => state.quickSend.loadedTemplateId;
const selectLoadedTemplateSaId = (state: AppState) => state.quickSend.loadedTemplateSaId;
const selectLoadedTemplateName = (state: AppState) => state.quickSend.loadedTemplateName;
const selectLoadedTemplateGroupId = (state: AppState) => state.quickSend.loadedTemplateGroupId;

const selectSections = createSelector([selectSlice], (slice) => slice.sections);

const selectActiveSectionId = createSelector(
  [selectSlice],
  (slice) => slice.activeSectionId,
);

const selectActiveSection = createSelector(
  [selectSections, selectActiveSectionId],
  (sections, activeSectionId): QSSection =>
    sections.find((s) => s.sectionId === activeSectionId) ?? sections[0],
);

const selectCustomerState = createSelector(
  [selectSlice],
  (slice) => slice.customer,
);

const selectNameOverride = createSelector(
  [selectCustomerState],
  (customer) => customer.nameOverride,
);

const selectSizeOverride = createSelector(
  [selectCustomerState],
  (customer) => customer.sizeOverride,
);

const selectTaxRateZipOverride = createSelector(
  [selectCustomerState],
  (customer) => customer.taxRateZipOverride,
);

/**
 * The effective tax rate to use for the @taxRate mention.
 * If a zip override is selected, uses that zip's taxRate.
 * Otherwise falls back to the loaded customer's taxRate.
 * Returns null when neither is available.
 */
const selectEffectiveTaxRate = createSelector(
  [selectCustomerState, zipCodeSelect.zipCodeMap],
  (customerState, zipCodeMap): number | null => {
    if (customerState.taxRateZipOverride != null) {
      return zipCodeMap.get(customerState.taxRateZipOverride)?.taxRate ?? null;
    }
    return customerState.customer?.taxRate ?? null;
  },
);

// ---------------------------------------------------------------------------
// Program configs — global (shared across all sections)
// ---------------------------------------------------------------------------

const selectProgramConfigs = createSelector(
  [selectSlice],
  (slice) => slice.programConfigs,
);

const selectProgramConfigMap = createSelector(
  [selectProgramConfigs],
  (configs) => new Grouper(configs).toUniqueMap((c) => c.alias),
);

// ---------------------------------------------------------------------------
// Active-section scoped selectors
// ---------------------------------------------------------------------------

const selectTemplateHtml = createSelector(
  [selectActiveSection],
  (section) => section.templateHtml,
);

/**
 * Parses the active section's template HTML for data-id attributes on mention spans
 * and returns the set of active flat variable keys.
 */
const selectActiveVars = createSelector(
  [selectTemplateHtml],
  (html): Set<QSVariableKey> => {
    const vars = new Set<QSVariableKey>();
    const matches = html.matchAll(/data-id="(name|size|taxRate|season|sgBillpayInfo)"/g);
    for (const match of matches) {
      vars.add(match[1] as QSVariableKey);
    }
    return vars;
  },
);

/**
 * Parses the active section's template HTML for dot-notation mention data-id attributes
 * and returns the QSProgramConfigs whose alias is present in the template.
 */
const selectActivePrograms = createSelector(
  [selectTemplateHtml, selectProgramConfigs],
  (html, configs): QSProgramConfig[] => {
    const activeAliases = new Set<string>();
    const matches = html.matchAll(/data-id="program\.([^."]+)\.[^"]+"/g);
    for (const match of matches) {
      activeAliases.add(match[1]);
    }
    return configs.filter((c) => activeAliases.has(c.alias));
  },
);

/**
 * Resolved variable values — what the mention nodes display in the preview.
 */
const selectResolvedVariables = createSelector(
  [selectNameOverride, selectSizeOverride, selectEffectiveTaxRate, globalSettingsSelect.season],
  (name, size, taxRate, season): Partial<Record<QSVariableKey, string>> => ({
    name: name || undefined,
    size: size || undefined,
    taxRate: taxRate != null ? `${taxRate.toFixed(3)}%` : undefined,
    season: season != null ? String(season) : undefined,
  }),
);

/** Variables that are present in the active section but have no resolved value yet. */
const selectUnfulfilledVars = createSelector(
  [selectActiveVars, selectNameOverride, selectSizeOverride, selectEffectiveTaxRate, globalSettingsSelect.season, selectCustomerState],
  (activeVars, name, size, taxRate, season, customerState): Set<QSVariableKey> => {
    const unfulfilled = new Set<QSVariableKey>();
    if (activeVars.has("name") && !name) unfulfilled.add("name");
    if (activeVars.has("size") && !size) unfulfilled.add("size");
    if (activeVars.has("taxRate") && taxRate == null) unfulfilled.add("taxRate");
    if (activeVars.has("season") && season == null) unfulfilled.add("season");
    if (activeVars.has("sgBillpayInfo") && customerState.customer == null) unfulfilled.add("sgBillpayInfo");
    return unfulfilled;
  },
);

/**
 * For each active program config in the active section, computes all resolved
 * property values using ProgCodeUtils scoped to the included ServCodes and the
 * customer size.
 */
const selectProgramVariables = createSelector(
  [selectActivePrograms, progServSelect.progCodeMap, selectSizeOverride, prepaySelect.prepayDocMap, selectEffectiveTaxRate],
  (activePrograms, progCodeMap, sizeOverride, prepayDocMap, effectiveTaxRate): QSProgramVariables[] => {
    const size = parseFloat(sizeOverride);
    const hasSize = !isNaN(size) && size > 0;

    return activePrograms.map((config) => {
      const progCode = progCodeMap.get(config.progCodeId);
      const prepayDoc = config.prepayId != null ? prepayDocMap.get(config.prepayId) : undefined;
      const prepayPercent = prepayDoc?.percent ?? null;
      const servCount = config.includedServCodeIds.length;

      if (!progCode) {
        return {
          alias: config.alias,
          progCodeId: config.progCodeId,
          description: config.progCodeId,
          servCount,
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

      const scoped = progCode.x.getByServCodeIds(config.includedServCodeIds);
      const pp = prepayPercent ?? 0;
      const tr = effectiveTaxRate ?? 0;

      const includedServCodes = progCode.servCodes.filter((s) =>
        config.includedServCodeIds.includes(s.servCodeId),
      );
      const servTable = includedServCodes.map((servCode) => {
        const singleScoped = progCode.x.getByServCodeIds([servCode.servCodeId]);
        return {
          description: servCode.longName,
          price: hasSize ? singleScoped.getServPrice(size) : null,
        };
      });

      return {
        alias: config.alias,
        progCodeId: config.progCodeId,
        description: progCode.description,
        servCount,
        prefPrice: hasSize ? scoped.getPrefPrice(size) : null,
        econPrice: hasSize ? scoped.getEconPrice(size) : null,
        servPrice: hasSize ? scoped.getServPrice(size) : null,
        subTotal: hasSize ? scoped.getSubTotal(size) : null,
        prepayPercent,
        prepayDiscAmt: hasSize ? scoped.getPrepayDiscAmt(size, pp) : null,
        taxAmt: hasSize && effectiveTaxRate !== null ? scoped.getTaxAmt(size, pp, tr) : null,
        total: hasSize && effectiveTaxRate !== null ? scoped.getTotal(size, pp, tr) : null,
        servTable,
      };
    });
  },
);

const UNFULFILLED_MARK = `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">`;

function resolveHtml(
  html: string,
  name: string,
  size: string,
  taxRate: string | null,
  season: string | null,
  progVarMap: Map<string, QSProgramVariables>,
  customer: Customer | null = null,
): string {
  let preview = html;

  if (name) {
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${name}"$3${name}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{name}}</mark>`,
    );
  }

  if (size) {
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${size}"$3${size}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="size"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{size}}</mark>`,
    );
  }

  if (taxRate) {
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${taxRate}"$3${taxRate}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="taxRate"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{taxRate}}</mark>`,
    );
  }

  if (season) {
    preview = preview.replace(
      /(<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
      `$1data-label="${season}"$3${season}$4`,
    );
  } else {
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="season"[^>]*>[^<]*<\/span>/g,
      `${UNFULFILLED_MARK}{{season}}</mark>`,
    );
  }

  // "sgBillpayInfo" is a block mention — replaces the span with an HTML table of
  // Spring-Green online account registration fields (Account Number, Last Name, Zip Code).
  // Data comes exclusively from CRM; no overrides are provided.
  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="sgBillpayInfo"[^>]*>[^<]*<\/span>/g,
    () => {
      if (!customer) return `${UNFULFILLED_MARK}{{sgBillpayInfo}}</mark>`;
      const rows = [
        `<tr><td>Account Number</td><td>${customer.custId}</td></tr>`,
        `<tr><td>Last Name</td><td>${customer.lastName}</td></tr>`,
        `<tr><td>Zip Code</td><td>${customer.address.zip ?? ""}</td></tr>`,
      ].join("");
      return `<table><tbody>${rows}</tbody></table>`;
    },
  );

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="(program\.[^"]+)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, mentionId: string) => {
      const parts = mentionId.split(".");

      // 3-part: program.{alias}.{prop}
      if (parts.length === 3 && parts[0] === "program") {
        const alias = parts[1];
        const prop = parts[2];
        const vars = progVarMap.get(alias);

        if (!vars) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;

        // "prepay" is a special leaf — resolves to the prepay discount percentage
        if (prop === "prepay") {
          const value = vars.prepayPercent;
          if (value === null || value === undefined) {
            return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
          }
          const displayValue = `${value}%`;
          return fullMatch
            .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
            .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
        }

        // "servTable" is a block mention — replaces the span with an HTML table
        if (prop === "servTable") {
          if (vars.servTable.length === 0) {
            return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
          }
          const rows = vars.servTable
            .map((row) => {
              const priceCell =
                row.price !== null ? `$${row.price.toFixed(2)}` : "—";
              return `<tr><td>${row.description}</td><td>${priceCell}</td></tr>`;
            })
            .join("");
          return `<table><tbody>${rows}</tbody></table>`;
        }

        const typedProp = prop as QSProgLeafKey;
        const value = vars[typedProp];
        if (value === null || value === undefined) {
          return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
        }

        const isDollarAmount =
          (typedProp.toLowerCase().includes("price") ||
            typedProp.toLowerCase().includes("amt") ||
            typedProp === "subTotal" ||
            typedProp === "total") &&
          typeof value === "number";
        const displayValue = isDollarAmount ? `$${value.toFixed(2)}` : String(value);

        return fullMatch
          .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
          .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
      }

      return fullMatch;
    },
  );

  return preview;
}

/**
 * Produces the preview HTML for the active section by replacing mention span
 * labels with resolved values.
 */
const selectPreviewHtml = createSelector(
  [
    selectTemplateHtml,
    selectNameOverride,
    selectSizeOverride,
    selectEffectiveTaxRate,
    globalSettingsSelect.season,
    selectProgramVariables,
    selectCustomerState,
  ],
  (html, name, size, effectiveTaxRate, season, programVars, customerState): string => {
    if (!html) return "";
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const progVarMap = new Map(programVars.map((v) => [v.alias, v]));
    return resolveHtml(html, name, size, taxRateStr, season != null ? String(season) : null, progVarMap, customerState.customer);
  },
);

/**
 * Declarative map of which controls each trigger activates.
 * - QSVariableKey triggers fire when that variable is present in the template.
 * - "program" fires when any program mention is present.
 *
 * Controls are added in the order they appear here, deduped automatically.
 * This is the authoritative source for control dependencies — prefer editing
 * this table over adding imperative logic to selectActiveControlIds.
 */
const CONTROL_DEPS: { trigger: QSVariableKey | "program"; controls: TemplateControlId[] }[] = [
  { trigger: "name",           controls: ["customerLookup", "nameOverride"] },
  { trigger: "size",           controls: ["customerLookup", "sizeOverride"] },
  { trigger: "taxRate",        controls: ["customerLookup", "taxRateOverride"] },
  { trigger: "sgBillpayInfo",  controls: ["customerLookup"] },
  { trigger: "program",        controls: ["customerLookup", "sizeOverride", "taxRateOverride"] },
];

/**
 * Returns a deduped, ordered array of control IDs that the left panel should render,
 * based on the active section's template content.
 */
const selectActiveControlIds = createSelector(
  [selectActiveVars, selectActivePrograms],
  (activeVars, activePrograms): TemplateControlId[] => {
    const ids: TemplateControlId[] = [];
    const seen = new Set<TemplateControlId>();

    const add = (id: TemplateControlId) => {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    };

    for (const { trigger, controls } of CONTROL_DEPS) {
      const isActive =
        trigger === "program" ? activePrograms.length > 0 : activeVars.has(trigger);
      if (isActive) {
        for (const control of controls) {
          add(control);
        }
      }
    }

    // Per-program configs are dynamic — one entry per alias
    for (const config of activePrograms) {
      add(`programConfig:${config.alias}`);
    }

    return ids;
  },
);

// ---------------------------------------------------------------------------
// All-sections preview (used by QuickSendEditor stacked preview pane)
// ---------------------------------------------------------------------------

/**
 * Returns preview HTML for every section. Uses the global programConfigs.
 */
const selectAllPreviewHtmls = createSelector(
  [selectSections, selectNameOverride, selectSizeOverride, selectEffectiveTaxRate, globalSettingsSelect.season, selectProgramConfigs, progServSelect.progCodeMap, prepaySelect.prepayDocMap, selectCustomerState],
  (sections, name, size, effectiveTaxRate, season, programConfigs, progCodeMap, prepayDocMap, customerState): { sectionId: string; previewHtml: string }[] => {
    const sizeNum = parseFloat(size);
    const hasSize = !isNaN(sizeNum) && sizeNum > 0;
    const taxRateStr = effectiveTaxRate != null ? `${effectiveTaxRate.toFixed(3)}%` : null;
    const seasonStr = season != null ? String(season) : null;

    // Build a single progVarMap from all global programConfigs
    const progVarMap = new Map<string, QSProgramVariables>();
    for (const config of programConfigs) {
      const progCode = progCodeMap.get(config.progCodeId);
      const prepayDoc = config.prepayId != null ? prepayDocMap.get(config.prepayId) : undefined;
      const prepayPercent = prepayDoc?.percent ?? null;
      const servCount = config.includedServCodeIds.length;
      const pp = prepayPercent ?? 0;
      const tr = effectiveTaxRate ?? 0;

      if (!progCode) {
        progVarMap.set(config.alias, {
          alias: config.alias,
          progCodeId: config.progCodeId,
          description: config.progCodeId,
          servCount,
          prefPrice: null,
          econPrice: null,
          servPrice: null,
          subTotal: null,
          prepayPercent,
          prepayDiscAmt: null,
          taxAmt: null,
          total: null,
          servTable: [],
        });
        continue;
      }
      const scoped = progCode.x.getByServCodeIds(config.includedServCodeIds);
      const includedServCodes = progCode.servCodes.filter((s) =>
        config.includedServCodeIds.includes(s.servCodeId),
      );
      const servTable = includedServCodes.map((servCode) => {
        const singleScoped = progCode.x.getByServCodeIds([servCode.servCodeId]);
        return {
          description: servCode.longName,
          price: hasSize ? singleScoped.getServPrice(sizeNum) : null,
        };
      });
      progVarMap.set(config.alias, {
        alias: config.alias,
        progCodeId: config.progCodeId,
        description: progCode.description,
        servCount,
        prefPrice: hasSize ? scoped.getPrefPrice(sizeNum) : null,
        econPrice: hasSize ? scoped.getEconPrice(sizeNum) : null,
        servPrice: hasSize ? scoped.getServPrice(sizeNum) : null,
        subTotal: hasSize ? scoped.getSubTotal(sizeNum) : null,
        prepayPercent,
        prepayDiscAmt: hasSize ? scoped.getPrepayDiscAmt(sizeNum, pp) : null,
        taxAmt: hasSize && effectiveTaxRate !== null ? scoped.getTaxAmt(sizeNum, pp, tr) : null,
        total: hasSize && effectiveTaxRate !== null ? scoped.getTotal(sizeNum, pp, tr) : null,
        servTable,
      });
    }

    return sections.map((section) => ({
      sectionId: section.sectionId,
      previewHtml: section.templateHtml
        ? resolveHtml(section.templateHtml, name, size, taxRateStr, seasonStr, progVarMap, customerState.customer)
        : "",
    }));
  },
);

export const quickSendSelect = {
  sections: selectSections,
  activeSectionId: selectActiveSectionId,
  activeSection: selectActiveSection,
  customerState: selectCustomerState,
  programConfigs: selectProgramConfigs,
  programConfigMap: selectProgramConfigMap,
  activeVars: selectActiveVars,
  activePrograms: selectActivePrograms,
  activeControlIds: selectActiveControlIds,
  resolvedVariables: selectResolvedVariables,
  unfulfilledVars: selectUnfulfilledVars,
  programVariables: selectProgramVariables,
  previewHtml: selectPreviewHtml,
  allPreviewHtmls: selectAllPreviewHtmls,
  taxRateZipOverride: selectTaxRateZipOverride,
  effectiveTaxRate: selectEffectiveTaxRate,
  loadedTemplateId: selectLoadedTemplateId,
  loadedTemplateSaId: selectLoadedTemplateSaId,
  loadedTemplateName: selectLoadedTemplateName,
  loadedTemplateGroupId: selectLoadedTemplateGroupId,
};
