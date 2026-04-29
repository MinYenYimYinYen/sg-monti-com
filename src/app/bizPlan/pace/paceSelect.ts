import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectServCodesFinished = createSelector(
  [deepSelect.servCodes],
  (servCodes) => {
    return servCodes.map((servCode) => {
      const finishedServices = servCode.services.filter(
        (s) => s.status === "S",
      );
      return {
        ...servCode,
        services: finishedServices,
      };
    });
  },
);

const selectServCodeUnfinished = createSelector(
  [deepSelect.servCodes],
  (servCodes) => {
    return servCodes.map((servCode) => {
      const unfinishedServices = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      return {
        ...servCode,
        services: unfinishedServices,
      };
    });
  },
);

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;

  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;

  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;
};

const selectServCodePaceMap = createSelector(
  [selectServCodeUnfinished, selectServCodesFinished],
  (unfinishedServCodes, finishedServCodes): Map<string, ServCodePace> => {
    // Pre-index finished serv codes by servCodeId for O(1) lookup
    const finishedByServCodeId = new Grouper(finishedServCodes).toUniqueMap(
      (s) => s.servCodeId,
    );

    const servCodePaceMap = new Map<string, ServCodePace>();

    for (const servCode of unfinishedServCodes) {
      const daysRemaining = servCode.x.daysRemaining;

      const unfinishedCSP =
        servCode.services.length > 0
          ? CountSizePriceOps.sumAll(
              ...servCode.services.map((s) => CountSizePriceOps.fromService(s)),
            )
          : { ...baseCountSizePrice };

      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        daysRemaining,
      );

      const finishedServCode = finishedByServCodeId.get(servCode.servCodeId);
      const finishedServices = finishedServCode?.services ?? [];
      const totalWeekdays = servCode.x.weekDays.length;

      const finishedCSP =
        finishedServices.length > 0
          ? CountSizePriceOps.sumAll(
              ...finishedServices.map((s) => CountSizePriceOps.fromService(s)),
            )
          : { ...baseCountSizePrice };

      // Rate of completion relative to total season weekdays
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        totalWeekdays,
      );

      servCodePaceMap.set(servCode.servCodeId, {
        servCode,
        daysRemaining,
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
      });
    }

    return servCodePaceMap;
  },
);

const selectServCodePaceRows = createSelector(
  [selectServCodePaceMap],
  (paceMap): ServCodePace[] =>
    Array.from(paceMap.values()).sort((a, b) =>
      a.servCode.servCodeId.localeCompare(b.servCode.servCodeId),
    ),
);

export const paceSelect = {
  servCodePaceMap: selectServCodePaceMap,
  servCodePaceRows: selectServCodePaceRows,
};
