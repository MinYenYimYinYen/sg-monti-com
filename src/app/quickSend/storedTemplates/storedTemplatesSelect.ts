import type { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectTemplates = (state: AppState) => state.storedTemplates.templates;
const selectGroups = (state: AppState) => state.storedTemplates.groups;

/** Map of templateId → StoredTemplateDoc for O(1) lookups. */
const selectTemplateMap = createSelector(
  [selectTemplates],
  (templates) => new Grouper(templates).toUniqueMap((t) => t.templateId),
);

/** Map of groupId → TemplateGroupDoc for O(1) lookups. */
const selectGroupMap = createSelector(
  [selectGroups],
  (groups) => new Grouper(groups).toUniqueMap((g) => g.groupId),
);

/** Templates grouped by groupId — Map<groupId, StoredTemplateDoc[]>. */
const selectTemplatesByGroup = createSelector(
  [selectTemplates],
  (templates) => new Grouper(templates).groupBy((t) => t.groupId ?? "__ungrouped__").toMap(),
);

export const storedTemplatesSelect = {
  templates: selectTemplates,
  groups: selectGroups,
  templateMap: selectTemplateMap,
  groupMap: selectGroupMap,
  templatesByGroup: selectTemplatesByGroup,
};
