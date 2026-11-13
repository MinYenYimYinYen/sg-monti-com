"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentGroupActions } from "@/app/assignmentGroup/assignmentGroupSlice";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/** `canLoad` comes from the component (hooks do not select). Absent means allowed. */
export function useAssignmentGroup({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        assignmentGroupActions.getGroups({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

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
