"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { depositSelect } from "@/app/javelin/depositSelect";
import { depositActions } from "@/app/javelin/depositSlice";
import { PlanEntryList } from "@/app/javelin/_lib/components/PlanEntryList";
import { PostRunPanel } from "@/app/javelin/_lib/components/PostRunPanel";

/**
 * Parse problems for the dropped deposit file, then the server's verdict on each deposit. Until
 * the user checks the entries there is no verdict, only the rows.
 */
export function DepositResultsTable() {
  const dispatch = useAppDispatch();
  const rows = useSelector(depositSelect.rows);
  const errors = useSelector(depositSelect.errors);
  const warnings = useSelector(depositSelect.warnings);
  const plan = useSelector(depositSelect.plan);
  const confirmedDocNumbers = useSelector(depositSelect.confirmedDocNumbers);
  const lastRun = useSelector(depositSelect.lastRun);

  return (
    <div>
      <PostRunPanel
        lastRun={lastRun}
        dismissAction={() => dispatch(depositActions.clearLastRun())}
      />

      {(errors.length > 0 || warnings.length > 0) && (
        <ul className="mb-4 space-y-1 text-sm">
          {errors.map((error) => (
            <li key={`e:${error}`} className="text-destructive">
              {error}
            </li>
          ))}
          {warnings.map((warning) => (
            <li key={`w:${warning}`} className="text-muted-foreground">
              {warning}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && plan.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {rows.length} deposit{rows.length === 1 ? "" : "s"} loaded. Choose Check entries to see
          what would be posted.
        </p>
      )}

      <PlanEntryList
        plan={plan}
        confirmedDocNumbers={confirmedDocNumbers}
        toggleConfirmedAction={(docNumber) => dispatch(depositActions.toggleConfirmed(docNumber))}
      />
    </div>
  );
}
