import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentPlanActions } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";

export function useAssignmentPlan({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        assignmentPlanActions.getAssignmentPlans({
          params: {},
          config: { loadingMsg: "Loading assignment plans..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  useEffect(() => {
    dispatch(
      assignmentPlanActions.getScenarios({
        params: {},
        config: { showLoading: false },
      }),
    );
  }, [dispatch]);

  const upsert = (
    params: AssignmentPlanContract["upsertAssignmentPlan"]["params"],
  ) =>
    dispatch(
      assignmentPlanActions.upsertAssignmentPlan({
        params,
        config: { showLoading: false },
      }),
    );

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

  return { upsert, upsertScenario, removeScenario };
}
