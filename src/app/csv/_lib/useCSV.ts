import { useCallback } from "react";
import { parseAssignmentFromUnservicedReport } from "@/app/csv/_lib/unservicedParser";
import { useAssignments } from "@/app/assignment/useAssignments";
import { toast } from "react-toastify";

export function useCSV() {
  const { saveAssignments } = useAssignments();

  const parseAssignments = useCallback(
    async (file: File) => {
      const result = await parseAssignmentFromUnservicedReport(file);

      if (result.success) {
        saveAssignments(result.data);

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
    [saveAssignments],
  );

  return { parseAssignments };
}
