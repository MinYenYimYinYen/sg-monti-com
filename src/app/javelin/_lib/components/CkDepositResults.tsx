"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ckDepositSelect } from "@/app/javelin/ckDepositSelect";
import { ckDepositActions } from "@/app/javelin/ckDepositSlice";
import { useJavelin } from "@/app/javelin/useJavelin";
import { PlanEntryList } from "@/app/javelin/_lib/components/PlanEntryList";
import { PostRunPanel } from "@/app/javelin/_lib/components/PostRunPanel";

/** The server's verdict on each deposit. Until the user checks the entries there is none. */
export function CkDepositResults() {
  const dispatch = useAppDispatch();
  const summary = useSelector(ckDepositSelect.summary);
  const plan = useSelector(ckDepositSelect.plan);
  const confirmedDocNumbers = useSelector(ckDepositSelect.confirmedDocNumbers);
  const lastRun = useSelector(ckDepositSelect.lastRun);
  const { previewCkDeposits } = useJavelin({ autoLoad: false });

  const handleToggleConfirmed = (docNumber: string) => {
    const nextConfirmed = confirmedDocNumbers.includes(docNumber)
      ? confirmedDocNumbers.filter((confirmed) => confirmed !== docNumber)
      : [...confirmedDocNumbers, docNumber];
    dispatch(ckDepositActions.toggleConfirmed(docNumber));
    // The plan still says "possible duplicate" until it is made again with the confirmation.
    previewCkDeposits({ rows: summary.rows, confirmedDocNumbers: nextConfirmed });
  };

  return (
    <div>
      <PostRunPanel
        lastRun={lastRun}
        dismissAction={() => dispatch(ckDepositActions.clearLastRun())}
      />

      <PlanEntryList
        plan={plan}
        confirmedDocNumbers={confirmedDocNumbers}
        toggleConfirmedAction={handleToggleConfirmed}
      />
    </div>
  );
}
