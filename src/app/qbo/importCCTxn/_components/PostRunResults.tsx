"use client";

import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/style/components/button";
import { importPostSelect } from "@/app/qbo/importCCTxn/post/importPostSelect";
import { useImportPost } from "@/app/qbo/importCCTxn/post/useImportPost";
import { formatCents } from "@/app/qbo/importCCTxn/_lib/importFileUtils";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * What the last posting run did, with every row accounted for: posted, failed, unknown, sent back,
 * blocked before sending, or not sent because the run stopped. Stays until dismissed.
 */
export function PostRunResults() {
  const lastRun = useSelector(importPostSelect.lastRun);
  const summary = useSelector(importPostSelect.lastRunSummary);
  const { clearResults } = useImportPost();
  if (!lastRun || !summary) return null;

  const needsAttention = lastRun.results.filter((result) => result.outcome !== "posted");

  return (
    <div className="space-y-3 rounded-md border border-border bg-accent/10 p-4">
      <div className="flex flex-wrap gap-6 text-sm">
        <Stat label="Posted" value={`${summary.postedCount} (${formatCents(summary.postedCents)})`} />
        {summary.failedCount > 0 && <Stat label="Failed" value={String(summary.failedCount)} />}
        {summary.unknownCount > 0 && (
          <Stat label="Check in QuickBooks" value={String(summary.unknownCount)} />
        )}
        {summary.pendingCount > 0 && (
          <Stat label="Sent back unposted" value={String(summary.pendingCount)} />
        )}
        {summary.blockedCount > 0 && <Stat label="Not sent" value={String(summary.blockedCount)} />}
        {summary.notAttemptedCount > 0 && (
          <Stat label="Held back" value={String(summary.notAttemptedCount)} />
        )}
      </div>

      {lastRun.stopReason && (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          {lastRun.stopReason} They stay pending, so you can post them again once you have looked at
          what went wrong.
        </p>
      )}

      {needsAttention.length > 0 && (
        <ul className="space-y-2 text-sm">
          {needsAttention.map((result) => (
            <li key={result.row.rowId}>
              <span className="font-semibold text-foreground">{result.row.description}</span>{" "}
              <span className="text-muted-foreground">
                {result.row.transactionDate}, {formatCents(result.row.amountCents)}: {result.outcome}
              </span>
              {result.row.postMessage && (
                <div className="text-xs text-muted-foreground">{result.row.postMessage}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {lastRun.blockedRows.length > 0 && (
        <ul className="space-y-2 text-sm">
          {lastRun.blockedRows.map((blocked) => (
            <li key={blocked.rowId}>
              <span className="font-semibold text-foreground">{blocked.description}</span>{" "}
              <span className="text-muted-foreground">
                {blocked.transactionDate}, {formatCents(blocked.amountCents)}: not sent
              </span>
              <div className="text-xs text-destructive">{blocked.problems.join(" ")}</div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="primary" intensity="soft" onClick={clearResults}>
        Dismiss
      </Button>
    </div>
  );
}
