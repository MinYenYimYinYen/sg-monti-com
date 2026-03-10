import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { keywordSelect } from "@/app/realGreen/callAhead/selectors/keywordSelect";

const selectCallAheadDocs = (state: AppState) => state.callAhead.callAheadDocs;
const selectCallAheadDocMap = createSelector(
  [selectCallAheadDocs],
  (callAheadDocs) => {
    return new Grouper(callAheadDocs).toUniqueMap((c) => c.callAheadId);
  },
);

const selectCallAheads = createSelector(
  [selectCallAheadDocs, keywordSelect.keywordMap, globalSettingsSelect.settings],
  (callAheadDocs, keywordMap, settings) => {
    //phoneMap is currently hardcoded in baseGlobalSettings.ts
    const phoneMap = settings?.phoneMap ?? baseGlobalSettings.phoneMap;

    return callAheadDocs.map((doc) => {
      const contactTypesFlat = doc.notificationTypes.flatMap(
        (type) => phoneMap[type],
      );
      const contactTypeSet = new Set(contactTypesFlat);
      const contactTypes = Array.from(contactTypeSet);
      const keywordMessage: string = doc.keywordIds.map((keywordId) => {
        const keyword = keywordMap.get(keywordId);
        return keyword?.message ?? "";
      }).join(" ");

      const callAhead: CallAhead = {
        ...doc,
        contactTypes,
        keywordMessage,
      };
      return callAhead;
    });
  },
);

const selectCallAheadMap = createSelector(
  [selectCallAheads],
  (callAheads) => {
    return new Grouper(callAheads).toUniqueMap((c) => c.callAheadId);
  },
);

export const callAheadSelect = {
  callAheadDocs: selectCallAheadDocs,
  callAheadDocMap: selectCallAheadDocMap,
  callAheads: selectCallAheads,
  callAheadMap: selectCallAheadMap,
};
