import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

const selectCallAheadDocs = (state: AppState) => state.callAhead.callAheadDocs;
const selectCallAheadDocMap = createSelector(
  [selectCallAheadDocs],
  (callAheadDocs) => {
    return new Grouper(callAheadDocs).toUniqueMap((c) => c.callAheadId);
  },
);

const selectCallAheads = createSelector(
  [selectCallAheadDocs, globalSettingsSelect.settings],
  (callAheadDocs, settings) => {
    //phoneMap is currently hardcoded in baseGlobalSettings.ts
    const phoneMap = settings?.phoneMap ?? baseGlobalSettings.phoneMap;

    return callAheadDocs.map((doc) => {
      const contactTypesFlat = doc.notificationTypes.flatMap(
        (type) => phoneMap[type],
      );
      const contactTypeSet = new Set(contactTypesFlat);
      const contactTypes = Array.from(contactTypeSet);

      const callAhead: CallAhead = {
        ...doc,
        contactTypes,
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
