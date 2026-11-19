"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

type UseAssignmentsOptions = {
  /** When provided, auto-fetches assignments for these servIds (streaming-reactive, deduplicated). */
  servIds?: number[];
};

export function useAssignments({ servIds }: UseAssignmentsOptions = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!servIds || servIds.length === 0) return;
    dispatch(
      assignmentActions.getByServIds({
        params: { servIds },
        config: { loadingMsg: "Loading assignments..." },
      }),
    );
  }, [dispatch, servIds]);

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
