"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentGroupActions } from "@/app/assignmentGroup/assignmentGroupSlice";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useAssignmentGroup({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        assignmentGroupActions.getGroups({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const upsertGroup = (group: AssignmentGroup) =>
    dispatch(
      assignmentGroupActions.upsertGroup({
        params: group,
        config: { force: true },
      }),
    );

  const deleteGroup = (groupId: string) =>
    dispatch(
      assignmentGroupActions.deleteGroup({
        params: { groupId },
        config: { force: true },
      }),
    );

  return { upsertGroup, deleteGroup };
}
