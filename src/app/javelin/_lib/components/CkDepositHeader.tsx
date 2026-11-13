"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { javelinCapabilities } from "@/app/javelin/javelinCapabilities";
import { Button } from "@/style/components/button";
import { ckDepositSelect } from "@/app/javelin/ckDepositSelect";
import { ckDepositActions } from "@/app/javelin/ckDepositSlice";
import { useJavelin } from "@/app/javelin/useJavelin";
import { PostConfirmDialog } from "@/app/javelin/_lib/components/PostConfirmDialog";

const { can } = javelinCapabilities;

/** Check entries asks the server what each deposit would do. Posting needs its own capability. */
export function CkDepositHeader() {
  const dispatch = useAppDispatch();
  const canPost = useSelector(userCapabilitiesSelect.allows)(can.journalEntryPostings.write);
  const summary = useSelector(ckDepositSelect.summary);
  const confirmedDocNumbers = useSelector(ckDepositSelect.confirmedDocNumbers);
  const postable = useSelector(ckDepositSelect.postable);
  const { previewCkDeposits, postCkDeposits } = useJavelin({ autoLoad: false });

  const canCheck = summary.rows.length > 0 && summary.incompleteCount === 0;

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <Button
        variant="primary"
        intensity="solid"
        disabled={!canCheck}
        onClick={() => previewCkDeposits({ rows: summary.rows, confirmedDocNumbers })}
      >
        Check entries
      </Button>

      {canPost && (
        <PostConfirmDialog
          count={postable.count}
          totalCents={postable.totalCents}
          noun="check deposit entry"
          disabled={postable.count === 0}
          confirmAction={() => postCkDeposits({ rows: summary.rows, confirmedDocNumbers })}
        />
      )}

      {!canPost && (
        <span className="text-sm text-muted-foreground">You cannot post to QuickBooks.</span>
      )}

      <Button
        variant="primary"
        intensity="ghost"
        onClick={() => dispatch(ckDepositActions.clearRows())}
      >
        Clear
      </Button>
    </div>
  );
}
