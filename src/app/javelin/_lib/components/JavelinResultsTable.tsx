"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { PlanEntryList } from "@/app/javelin/_lib/components/PlanEntryList";
import { PostRunPanel } from "@/app/javelin/_lib/components/PostRunPanel";

/**
 * Parse problems for each dropped file, then the server's verdict on each one. Until the user
 * checks the entries there is no verdict, only the files.
 */
export function JavelinResultsTable() {
  const dispatch = useAppDispatch();
  const files = useSelector(javelinSelect.files);
  const plan = useSelector(javelinSelect.plan);
  const confirmedDocNumbers = useSelector(javelinSelect.confirmedDocNumbers);
  const lastRun = useSelector(javelinSelect.lastRun);

  return (
    <div>
      <PostRunPanel
        lastRun={lastRun}
        dismissAction={() => dispatch(javelinActions.clearLastRun())}
      />

      {files.some((file) => file.errors.length > 0 || file.warnings.length > 0) && (
        <ul className="mb-4 space-y-1 text-sm">
          {files.flatMap((file) => [
            ...file.errors.map((error) => (
              <li key={`${file.fileName}:e:${error}`} className="text-destructive">
                {file.fileName}: {error}
              </li>
            )),
            ...file.warnings.map((warning) => (
              <li key={`${file.fileName}:w:${warning}`} className="text-muted-foreground">
                {file.fileName}: {warning}
              </li>
            )),
          ])}
        </ul>
      )}

      {files.length > 0 && plan.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {files.length} file{files.length === 1 ? "" : "s"} loaded. Choose Check entries to see
          what would be posted.
        </p>
      )}

      <PlanEntryList
        plan={plan}
        confirmedDocNumbers={confirmedDocNumbers}
        toggleConfirmedAction={(docNumber) => dispatch(javelinActions.toggleConfirmed(docNumber))}
      />
    </div>
  );
}
