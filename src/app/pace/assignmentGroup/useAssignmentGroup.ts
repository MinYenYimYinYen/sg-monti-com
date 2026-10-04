"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceAssignmentGroupActions } from "@/app/pace/assignmentGroup/assignmentGroupSlice";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function usePaceAssignmentGroup({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        paceAssignmentGroupActions.getGroups({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const upsertGroup = (group: AssignmentGroup) =>
    dispatch(
      paceAssignmentGroupActions.upsertGroup({
        params: group,
        config: { force: true },
      }),
    );

  const deleteGroup = (groupId: string) =>
    dispatch(
      paceAssignmentGroupActions.deleteGroup({
        params: { groupId },
        config: { force: true },
      }),
    );

  return { upsertGroup, deleteGroup };
}
