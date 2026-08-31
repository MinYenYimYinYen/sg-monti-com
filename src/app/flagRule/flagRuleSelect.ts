import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectFlagRules = (state: AppState) => state.flagRule.flagRules;

const selectFlagRuleMap = createSelector([selectFlagRules], (flagRules) =>
  new Grouper(flagRules).toUniqueMap((r) => r.flagRuleId),
);

/** Flat deduplicated array of all flagIds referenced by any FlagRule. */
const selectAllRuleFlagIds = createSelector([selectFlagRules], (rules) =>
  [...new Set(rules.flatMap((r) => r.flagIds))],
);

export const flagRuleSelect = {
  all: selectFlagRules,
  flagRuleMap: selectFlagRuleMap,
  allRuleFlagIds: selectAllRuleFlagIds,
};
