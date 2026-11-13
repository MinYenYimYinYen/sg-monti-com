"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

type UseAssignmentsOptions = {
  /** When provided, auto-fetches assignments for these servIds (streaming-reactive, deduplicated). */
  servIds?: number[];
  /**
   * Whether the user may read assignments. The component passes it (hooks do not select), and a
   * false value skips the load instead of firing a request the server refuses. Absent means allowed.
   */
  canLoad?: boolean;
};

export function useAssignments({ servIds, canLoad = true }: UseAssignmentsOptions = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad || !servIds || servIds.length === 0) return;
    dispatch(
      assignmentActions.getByServIds({
        params: { servIds },
        config: { loadingMsg: "Loading assignments..." },
      }),
    );
  }, [dispatch, servIds, canLoad]);

  const saveAssignments = (assignments: AssignmentDoc[]) => {
    dispatch(
      assignmentActions.saveAssignments({
        params: { assignments },
        config: { loadingMsg: "Saving assignments...", force: true },
      }),
    );
  };

  return { saveAssignments };
}
