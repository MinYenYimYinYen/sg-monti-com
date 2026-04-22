import { useCallback } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { parseAssignmentFromUnservicedReport } from "@/app/csv/_lib/unservicedParser";
import { centralDocPropsActions } from "@/app/csv/_lib/centralDocPropsSlice";
import { toast } from "react-toastify";

export function useCSV() {
  const dispatch = useAppDispatch();

  const parseAssignments = useCallback(
    async (file: File) => {
      const result = await parseAssignmentFromUnservicedReport(file);

      if (result.success) {
        dispatch(
          centralDocPropsActions.saveAssignments({
            params: { assignments: result.data },
            config: { force: true, showLoading: false },
          }),
        );

        if (result.warnings && result.warnings.length > 0) {
          const summary =
            result.warnings.length === 1
              ? result.warnings[0]
              : `${result.warnings.length} rows had warnings — check console for details`;

          toast.warn(summary, { autoClose: 6000 });
          console.warn("CSV parse warnings:", result.warnings);
        }
      } else {
        const summary =
          result.errors.length === 1
            ? result.errors[0]
            : `CSV upload failed with ${result.errors.length} errors — check console for details`;

        toast.error(summary, { autoClose: 8000 });
        console.error("CSV parse errors:", result.errors);
      }
    },
    [dispatch],
  );

  return { parseAssignments };
}
