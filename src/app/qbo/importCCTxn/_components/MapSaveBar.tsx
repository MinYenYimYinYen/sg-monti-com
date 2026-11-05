"use client";

import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import {
  useImportDecision,
  useResetImportDecisionStatus,
} from "@/app/qbo/importCCTxn/decisions/useImportDecision";

/**
 * The one place the Map tab saves. Save stays disabled until every transaction is ready (a
 * skipped one counts as ready), and then sends all the decisions in a single request. Parts the
 * server refuses stay in the draft and are listed here.
 */
export function MapSaveBar() {
  const progress = useSelector(importDecisionSelect.progress);
  const savePayload = useSelector(importDecisionSelect.savePayload);
  const hasChanges = useSelector(importDecisionSelect.hasChanges);
  const canSave = useSelector(importDecisionSelect.canSave);
  const saveStatus = useSelector(importDecisionSelect.saveStatus);
  const saveFailures = useSelector(importDecisionSelect.saveFailures);
  const { saveDecisions, discardDraft } = useImportDecision();
  useResetImportDecisionStatus();

  const mappingCount = savePayload.mappingDecisions.length;
  const skipCount = savePayload.skippedRowIds.length + savePayload.skipRuleMerchantKeys.length;

  return (
    <div className="sticky top-0 z-10 space-y-2 border-b border-border bg-background px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-muted-foreground">
          {progress.readyRowCount} of {progress.totalRowCount} ready
          {hasChanges && (
            <>
              . Unsaved: {mappingCount} merchant{mappingCount === 1 ? "" : "s"}, {skipCount} skip
              {skipCount === 1 ? "" : "s"}.
            </>
          )}
          {saveStatus === "success" && " Saved."}
        </p>
        <Button variant="primary" intensity="soft" disabled={!hasChanges} onClick={discardDraft}>
          Discard changes
        </Button>
        <Button variant="primary" disabled={!canSave} onClick={() => saveDecisions(savePayload)}>
          Save
        </Button>
      </div>
      {saveFailures.length > 0 && (
        <ul className="space-y-0.5 text-xs text-destructive">
          {saveFailures.map((failure) => (
            <li key={`${failure.merchantKey ?? ""}:${failure.rowId ?? ""}:${failure.message}`}>
              {failure.merchantKey ?? failure.rowId}: {failure.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
