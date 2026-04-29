import { createSelector } from "@reduxjs/toolkit";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

const selectServCodesDeep = createSelector(
  [progServSelect.servCodes, centralSelect.services],
  (servCodes, services) => {
    const servicesByServCodeId = new Grouper(services)
      .groupBy((s) => s.servCodeId)
      .toMap();
    return servCodes.map(
      (servCode): ServCodeDeep => ({
        ...servCode,
        services: servicesByServCodeId.get(servCode.servCodeId) ?? [],
      }),
    );
  },
);

const selectServCodeDeepMap = createSelector(
  [selectServCodesDeep],
  (servCodesDeep) =>
    new Grouper(servCodesDeep).toUniqueMap((s) => s.servCodeId),
);

export const deepSelect = {
  servCodes: selectServCodesDeep,
  servCodeMap: selectServCodeDeepMap,
};