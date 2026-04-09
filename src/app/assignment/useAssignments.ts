import { useAppDispatch } from "@/lib/hooks/redux";
import { assignmentActions } from "@/app/assignment/assignmentSlice";

export function useAssignments() {
  const dispatch = useAppDispatch();
  const getAssignmentsByEmployeeIdAndSchedDate = ({
    employeeId,
    schedDate,
  }: {
    employeeId: string;
    schedDate: string;
  }) => {
    dispatch(
      assignmentActions.getByEmployeeIdAndSchedDate({
        params: { employeeId, schedDate },
        config: {
          loadingMsg: `Loading ${employeeId}'s ${schedDate} assignments`,
          force: true,
        },
      }),
    );
  };
  return { getAssignmentsByEmployeeIdAndSchedDate };
}
