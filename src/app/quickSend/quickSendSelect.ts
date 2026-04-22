import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import type { QSVariableKey, QSProgramConfig, TemplateControlId } from "./QuickSendTypes";

const selectSlice = (state: AppState) => state.quickSend;

const selectTemplateHtml = createSelector(
  [selectSlice],
  (slice) => slice.templateHtml,
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

const selectProgramConfigs = createSelector(
  [selectSlice],
  (slice) => slice.programConfigs,
);

const selectProgramConfigMap = createSelector(
  [selectProgramConfigs],
  (configs) => new Grouper(configs).toUniqueMap((c) => c.progCodeId),
);

/**
 * Parses the template HTML for data-id attributes on mention spans
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
 * Parses the template HTML for dot-notation mention data-id attributes
 * (e.g. "MLC.price") and returns the unique progCodeId prefixes that are
 * both present in the template AND have a programConfig in state.
 */
const selectActivePrograms = createSelector(
  [selectTemplateHtml, selectProgramConfigs],
  (html, configs): QSProgramConfig[] => {
    const activeProgCodeIds = new Set<string>();
    // Match mention IDs of the form "program.{progCodeId}.{prop}"
    const matches = html.matchAll(/data-id="program\.([^."]+)\.[^"]+"/g);
    for (const match of matches) {
      activeProgCodeIds.add(match[1]);
    }
    return configs.filter((c) => activeProgCodeIds.has(c.progCodeId));
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

/** Variables that are present in the template but have no resolved value yet. */
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
  progCodeId: string;
  description: string;
  servCount: number;
  prefPrice: number | null;
  econPrice: number | null;
  price: number | null;
  totalPrice: number | null;
};

/**
 * For each active program config, computes all resolved property values
 * using ProgCodeUtils scoped to the included ServCodes and the customer size.
 */
const selectProgramVariables = createSelector(
  [selectActivePrograms, progServSelect.progCodeMap, selectSizeOverride],
  (activePrograms, progCodeMap, sizeOverride): QSProgramVariables[] => {
    const size = parseFloat(sizeOverride);
    const hasSize = !isNaN(size) && size > 0;

    return activePrograms.map((config) => {
      const progCode = progCodeMap.get(config.progCodeId);
      console.log(
        "[QS] progCode for",
        config.progCodeId,
        "→",
        progCode ? "found" : "NOT FOUND",
      );
      if (!progCode) {
        return {
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

/**
 * Produces the preview HTML by replacing mention span labels with resolved values.
 * Handles both flat vars (name, size) and dot-notation program vars (MLC.price, etc.).
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

    let preview = html;

    // --- Flat vars: name, size ---
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

    // --- Dot-notation program vars ---
    const progVarMap = new Map(programVars.map((v) => [v.progCodeId, v]));

    // Replace each dot-notation mention span with its resolved value.
    // ID format: "program.{progCodeId}.{prop}"
    preview = preview.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="(program\.[^"]+)"[^>]*>[^<]*<\/span>/g,
      (fullMatch, mentionId: string) => {
        // mentionId = "program.MLC.price"
        const parts = mentionId.split(".");
        if (parts.length !== 3 || parts[0] !== "program") return fullMatch;

        const progCodeId = parts[1];
        const prop = parts[2] as keyof QSProgramVariables;
        const vars = progVarMap.get(progCodeId);

        if (!vars) {
          return `${UNFULFILLED_MARK}{{${mentionId}}}</mark>`;
        }

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

        // Replace the span's label and inner text with the resolved value
        return fullMatch
          .replace(/data-label="[^"]*"/, `data-label="${displayValue}"`)
          .replace(/>([^<]*)<\/span>$/, `>${displayValue}</span>`);
      },
    );

    return preview;
  },
);

/**
 * Returns a deduped, ordered array of control IDs that the left panel should render.
 *
 * Ordering: customerLookup → nameOverride → sizeOverride → programConfig:X (in template order)
 *
 * Dependencies:
 * - @name          → customerLookup, nameOverride
 * - @size          → customerLookup, sizeOverride
 * - @program.X.*  → customerLookup, sizeOverride, programConfig:X
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
      add(`programConfig:${config.progCodeId}`);
    }

    return ids;
  },
);

export const quickSendSelect = {
  templateHtml: selectTemplateHtml,
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
};
