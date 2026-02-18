import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectFlagIdCustIds = (state: AppState) => state.custFlag.flagIdCustIds;
const selectCustIdFlagIds = createSelector(
  [selectFlagIdCustIds],
  (flagIdCustIds) => {
    const custIdFlagIds = new Map<number, number[]>();
    for (const flagIdCustId of flagIdCustIds.values()) {
      for (const custId of flagIdCustId.custIds) {
        const flagIds = custIdFlagIds.get(custId) ?? [];
        flagIds.push(flagIdCustId.flagId);
        custIdFlagIds.set(custId, flagIds);
      }
    }
    return custIdFlagIds;
  },
);

const selectFlagIdsInState = createSelector([selectFlagIdCustIds], (flagIdCustIds) => {
   const flagIds = [...flagIdCustIds.keys()];
   return flagIds;
})

export const custFlagSelect = {
  flagIdsInState: selectFlagIdsInState,
  custIdFlagIds: selectCustIdFlagIds,
};
