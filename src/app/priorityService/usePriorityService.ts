"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priorityServiceActions } from "@/app/priorityService/priorityServiceSlice";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { priorityServiceCustomerActions } from "@/app/realGreen/customer/slices/customerSlices";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";

export function usePriorityService({
  autoLoad,
}: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const docs = useSelector(priorityServiceSelect.docs);
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        priorityServiceActions.getAll({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  // Load the full customer/program/service data for each priority service doc.
  // Re-runs whenever docs change so status updates (e.g. status === "S") are reflected.
  useEffect(() => {
    if (!docs.length || !season) return;
    dispatch(
      priorityServiceCustomerActions.getDocs({
        params: {
          schemeName: "byServIds",
          season,
          schemeParams: { servIds: docs.map((d) => d.servId) },
        },
        config: {
          loadingMsg: "Loading priority services...",
          force: true,
        },
      }),
    );
  }, [dispatch, docs, season]);

  const upsert = (doc: PriorityServiceDoc) =>
    dispatch(
      priorityServiceActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (servId: number) =>
    dispatch(
      priorityServiceActions.deleteOne({
        params: { servId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
