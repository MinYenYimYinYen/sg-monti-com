import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import type {
  QSVariableKey,
  QSProgramConfig,
  QSSection,
  TemplateControlId,
} from "./QuickSendTypes";

const selectSlice = (state: AppState) => state.quickSend;

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
    const matches = html.matchAll(/data-id="(name|size)"/g);
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
  [selectNameOverride, selectSizeOverride],
  (name, size): Partial<Record<QSVariableKey, string>> => ({
    name: name || undefined,
    size: size || undefined,
  }),
);

/** Variables that are present in the active section but have no resolved value yet. */
const selectUnfulfilledVars = createSelector(
  [selectActiveVars, selectNameOverride, selectSizeOverride],
  (activeVars, name, size): Set<QSVariableKey> => {
    const unfulfilled = new Set<QSVariableKey>();
    if (activeVars.has("name") && !name) unfulfilled.add("name");
    if (activeVars.has("size") && !size) unfulfilled.add("size");
    return unfulfilled;
  },
);

type QSProgramVariables = {
  alias: string;
  progCodeId: string;
  description: string;
  servCount: number;
  prefPrice: number | null;
  econPrice: number | null;
  price: number | null;
  totalPrice: number | null;
};

/**
 * For each active program config in the active section, computes all resolved
 * property values using ProgCodeUtils scoped to the included ServCodes and the
 * customer size.
 */
const selectProgramVariables = createSelector(
  [selectActivePrograms, progServSelect.progCodeMap, selectSizeOverride],
  (activePrograms, progCodeMap, sizeOverride): QSProgramVariables[] => {
    const size = parseFloat(sizeOverride);
    const hasSize = !isNaN(size) && size > 0;

    return activePrograms.map((config) => {
      const progCode = progCodeMap.get(config.progCodeId);
      if (!progCode) {
        return {
          alias: config.alias,
          progCodeId: config.progCodeId,
          description: config.progCodeId,
          servCount: config.includedServCodeIds.length,
          prefPrice: null,
          econPrice: null,
          price: null,
          totalPrice: null,
        };
      }

      const scoped = progCode.x.getByServCodeIds(config.includedServCodeIds);
      const prefPrice = hasSize ? scoped.getPrefPrice(size) : null;
      const price = hasSize ? scoped.getPrice(size) : null;

      return {
        alias: config.alias,
        progCodeId: config.progCodeId,
        description: progCode.description,
        servCount: config.includedServCodeIds.length,
        prefPrice,
        econPrice: hasSize ? scoped.getEconPrice(size) : null,
        price,
        totalPrice: hasSize ? scoped.getTotalPrice(size) : null,
      };
    });
  },
);

const UNFULFILLED_MARK = `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">`;

function resolveHtml(
  html: string,
  name: string,
  size: string,
  progVarMap: Map<string, QSProgramVariables>,
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

  preview = preview.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="(program\.[^"]+)"[^>]*>[^<]*<\/span>/g,
    (fullMatch, mentionId: string) => {
      const parts = mentionId.split(".");
      if (parts.length !== 3 || parts[0] !== "program") return fullMatch;

      const alias = parts[1];
      const prop = parts[2] as Exclude<
        keyof QSProgramVariables,
        "alias" | "progCodeId" | "description" | "servCount"
      >;
      const vars = progVarMap.get(alias);

      if (!vars) return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;

      const value = vars[prop];
      if (value === null || value === undefined) {
        return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
      }

      const displayValue =
        typeof value === "number"
          ? prop.toLowerCase().includes("price")
            ? `$${value.toFixed(2)}`
            : String(value)
          : String(value);

      return fullMatch
        .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
        .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
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
    selectProgramVariables,
  ],
  (html, name, size, programVars): string => {
    if (!html) return "";
    const progVarMap = new Map(programVars.map((v) => [v.alias, v]));
    return resolveHtml(html, name, size, progVarMap);
  },
);

/**
 * Returns a deduped, ordered array of control IDs that the left panel should render,
 * based on the active section's template content.
 */
const selectActiveControlIds = createSelector(
  [selectActiveVars, selectActivePrograms],
  (activeVars, activePrograms): TemplateControlId[] => {
    const ids: TemplateControlId[] = [];
    const seen = new Set<string>();

    const add = (id: TemplateControlId) => {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    };

    const needsCustomerLookup =
      activeVars.has("name") ||
      activeVars.has("size") ||
      activePrograms.length > 0;

    if (needsCustomerLookup) add("customerLookup");
    if (activeVars.has("name")) add("nameOverride");
    if (activeVars.has("size") || activePrograms.length > 0) add("sizeOverride");
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
  [selectSections, selectNameOverride, selectSizeOverride, selectProgramConfigs, progServSelect.progCodeMap],
  (sections, name, size, programConfigs, progCodeMap): { sectionId: string; previewHtml: string }[] => {
    const sizeNum = parseFloat(size);
    const hasSize = !isNaN(sizeNum) && sizeNum > 0;

    // Build a single progVarMap from all global programConfigs
    const progVarMap = new Map<string, QSProgramVariables>();
    for (const config of programConfigs) {
      const progCode = progCodeMap.get(config.progCodeId);
      if (!progCode) {
        progVarMap.set(config.alias, {
          alias: config.alias,
          progCodeId: config.progCodeId,
          description: config.progCodeId,
          servCount: config.includedServCodeIds.length,
          prefPrice: null,
          econPrice: null,
          price: null,
          totalPrice: null,
        });
        continue;
      }
      const scoped = progCode.x.getByServCodeIds(config.includedServCodeIds);
      progVarMap.set(config.alias, {
        alias: config.alias,
        progCodeId: config.progCodeId,
        description: progCode.description,
        servCount: config.includedServCodeIds.length,
        prefPrice: hasSize ? scoped.getPrefPrice(sizeNum) : null,
        econPrice: hasSize ? scoped.getEconPrice(sizeNum) : null,
        price: hasSize ? scoped.getPrice(sizeNum) : null,
        totalPrice: hasSize ? scoped.getTotalPrice(sizeNum) : null,
      });
    }

    return sections.map((section) => ({
      sectionId: section.sectionId,
      previewHtml: section.templateHtml
        ? resolveHtml(section.templateHtml, name, size, progVarMap)
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
};
