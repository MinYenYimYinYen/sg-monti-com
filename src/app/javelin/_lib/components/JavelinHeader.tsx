"use client";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { javelinCapabilities } from "@/app/javelin/javelinCapabilities";
import { Button } from "@/style/components/button";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { useJavelin } from "@/app/javelin/useJavelin";
import { PostConfirmDialog } from "@/app/javelin/_lib/components/PostConfirmDialog";

const { can } = javelinCapabilities;

/** Preview checks the files against stored links and postings. Posting needs its own capability. */
export function JavelinHeader() {
  const dispatch = useAppDispatch();
  const canPost = useSelector(userCapabilitiesSelect.allows)(can.journalEntryPostings.write);
  const files = useSelector(javelinSelect.files);
  const confirmedDocNumbers = useSelector(javelinSelect.confirmedDocNumbers);
  const postable = useSelector(javelinSelect.postable);
  const { previewGenLedger, postGenLedger } = useJavelin({ autoLoad: false });

  const filesToSend = files
    .filter((file) => file.errors.length === 0 && file.rows.length > 0)
    .map(({ fileName, date, rows }) => ({ fileName, date, rows }));

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <Button
        variant="primary"
        intensity="solid"
        disabled={filesToSend.length === 0}
        onClick={() => previewGenLedger({ files: filesToSend, confirmedDocNumbers })}
      >
        Check entries
      </Button>

      {canPost && (
        <PostConfirmDialog
          count={postable.count}
          totalCents={postable.totalCents}
          noun="journal entry"
          disabled={postable.count === 0}
          confirmAction={() => postGenLedger({ files: filesToSend, confirmedDocNumbers })}
        />
      )}

      {!canPost && (
        <span className="text-sm text-muted-foreground">You cannot post to QuickBooks.</span>
      )}

      <Button
        variant="primary"
        intensity="ghost"
        onClick={() => dispatch(javelinActions.setFiles([]))}
        disabled={files.length === 0}
      >
        Clear
      </Button>
    </div>
  );
}
