"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { authSelect } from "@/app/auth/authSlice";
import { Button } from "@/style/components/button";
import { depositSelect } from "@/app/javelin/depositSelect";
import { depositActions } from "@/app/javelin/depositSlice";
import { useJavelin } from "@/app/javelin/useJavelin";
import { PostConfirmDialog } from "@/app/javelin/_lib/components/PostConfirmDialog";

/** Preview checks the deposits against stored links and postings. Posting is admin only. */
export function DepositHeader() {
  const dispatch = useAppDispatch();
  const role = useSelector(authSelect.role);
  const rows = useSelector(depositSelect.rows);
  const fileName = useSelector(depositSelect.fileName);
  const confirmedDocNumbers = useSelector(depositSelect.confirmedDocNumbers);
  const postable = useSelector(depositSelect.postable);
  const { previewDeposits, postDeposits } = useJavelin({ autoLoad: false });

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <Button
        variant="primary"
        intensity="solid"
        disabled={rows.length === 0}
        onClick={() => previewDeposits({ rows, fileName, confirmedDocNumbers })}
      >
        Check entries
      </Button>

      {role === "admin" && (
        <PostConfirmDialog
          count={postable.count}
          totalCents={postable.totalCents}
          noun="deposit entry"
          disabled={postable.count === 0}
          confirmAction={() => postDeposits({ rows, fileName, confirmedDocNumbers })}
        />
      )}

      {role !== "admin" && (
        <span className="text-sm text-muted-foreground">Only an admin can post to QuickBooks.</span>
      )}

      <Button
        variant="primary"
        intensity="ghost"
        onClick={() => dispatch(depositActions.setRows([]))}
        disabled={rows.length === 0}
      >
        Clear
      </Button>
    </div>
  );
}
