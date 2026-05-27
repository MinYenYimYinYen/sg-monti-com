import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";

export function useAssignmentPlan({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        assignmentPlanActions.getScenarios({
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
      assignmentPlanActions.upsertScenario({
        params,
        config: { showLoading: false },
      }),
    );

  const removeScenario = (name: string) =>
    dispatch(
      assignmentPlanActions.deleteScenario({
        params: { name },
        config: { showLoading: false },
      }),
    );

  const activateScenario = (name: string) =>
    dispatch(
      assignmentPlanActions.activateScenario({
        params: { name },
        config: { showLoading: false },
      }),
    );

  return { upsertScenario, removeScenario, activateScenario };
}
