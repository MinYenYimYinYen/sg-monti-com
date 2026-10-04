"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { AssignmentPlanContract } from "@/app/pace/assignmentPlan/api/AssignmentPlanContract";

export function usePaceAssignmentPlan({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        paceAssignmentPlanActions.getScenarios({
          params: {},
          config: { loadingMsg: "Loading scenarios..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const upsertScenario = (
    params: AssignmentPlanContract["upsertScenario"]["params"],
  ) =>
    dispatch(
      paceAssignmentPlanActions.upsertScenario({
        params,
        config: { showLoading: false },
      }),
    );

  const removeScenario = (name: string) =>
    dispatch(
      paceAssignmentPlanActions.deleteScenario({
        params: { name },
        config: { showLoading: false },
      }),
    );

  const activateScenario = (name: string) =>
    dispatch(
      paceAssignmentPlanActions.activateScenario({
        params: { name },
        config: { showLoading: false },
      }),
    );

  return { upsertScenario, removeScenario, activateScenario };
}
