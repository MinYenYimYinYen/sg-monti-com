import { useCallback, useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { parseAssignmentFromUnservicedReport } from "@/app/csv/_lib/unservicedParser";
import { centralDocPropsActions } from "@/app/csv/_lib/centralDocPropsSlice";

export function useCSV() {
  const dispatch = useAppDispatch();
  const [parseErrors, setParseErrors] = useState<unknown>(null);

  const parseAssignments = useCallback(
    async (file: File) => {
      setParseErrors(null);

      const result = await parseAssignmentFromUnservicedReport(file);

      if (result.success) {
        dispatch(
          centralDocPropsActions.saveAssignments({
            params: { assignments: result.data },
            config: { force: true, showLoading: false },
          }),
        );
      }
      if (!result.success) {
        setParseErrors(result.errors);
      }
    },
    [dispatch],
  );

  return { parseAssignments, parseErrors };
}
