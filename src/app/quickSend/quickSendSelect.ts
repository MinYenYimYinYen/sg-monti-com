import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import type { QSVariableKey } from "./QuickSendTypes";

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

/**
 * Parses the template HTML for data-id attributes on mention spans
 * and returns the set of active variable keys.
 */
const selectActiveVars = createSelector(
  [selectTemplateHtml],
  (html): Set<QSVariableKey> => {
    const vars = new Set<QSVariableKey>();
    // Match data-id="name" or data-id="size" in mention spans
    const matches = html.matchAll(/data-id="(name|size)"/g);
    for (const match of matches) {
      vars.add(match[1] as QSVariableKey);
    }
    return vars;
  },
);

/**
 * Resolved variable values — what the mention nodes display in the preview.
 * Falls back to the variable key name when no override is set.
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

/**
 * Produces the preview HTML by replacing mention span labels with resolved values.
 * The mention nodes themselves are preserved (same data-id, data-type attributes)
 * so the preview Tiptap editor can still parse them as mention nodes.
 * Only the visible text content inside the span is replaced.
 */
const selectPreviewHtml = createSelector(
  [selectTemplateHtml, selectNameOverride, selectSizeOverride],
  (html, name, size): string => {
    if (!html) return "";

    // Replace the inner text of mention spans for each variable.
    // Tiptap renders mentions as: <span data-type="mention" data-id="name" ...>@name</span>
    // We replace the text content while keeping the span and its attributes intact.
    let preview = html;

    // For each variable: if resolved, replace label + inner text with the value.
    // If unfulfilled, replace with {{varName}} and mark with data-unfulfilled="true"
    // so the preview editor can apply warning styling.
    if (name) {
      preview = preview.replace(
        /(<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*)(data-label="[^"]*")([^>]*>)[^<]*(<\/span>)/g,
        `$1data-label="${name}"$3${name}$4`,
      );
    } else {
      // Replace the entire mention span with a styled <mark> tag.
      // The Highlight extension (multicolor: true) preserves inline styles on <mark>
      // through setContent, unlike Mention node attributes which get stripped.
      preview = preview.replace(
        /<span[^>]*data-type="mention"[^>]*data-id="name"[^>]*>[^<]*<\/span>/g,
        `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">{{name}}</mark>`,
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
        `<mark style="background-color: rgba(220,38,38,0.3); border-radius: 3px; padding: 0 2px;">{{size}}</mark>`,
      );
    }

    return preview;
  },
);

export const quickSendSelect = {
  templateHtml: selectTemplateHtml,
  customerState: selectCustomerState,
  activeVars: selectActiveVars,
  resolvedVariables: selectResolvedVariables,
  unfulfilledVars: selectUnfulfilledVars,
  previewHtml: selectPreviewHtml,
};
