"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceAssignmentGroupActions } from "@/app/pace/assignmentGroup/assignmentGroupSlice";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers can omit it.
 */
export function usePaceAssignmentGroup({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        paceAssignmentGroupActions.getGroups({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsertGroup = (assignmentGroupDoc: AssignmentGroupDoc) =>
    dispatch(
      paceAssignmentGroupActions.upsertGroup({
        params: assignmentGroupDoc,
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
