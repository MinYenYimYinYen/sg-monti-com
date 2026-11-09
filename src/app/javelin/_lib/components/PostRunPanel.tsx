"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/style/components/button";
import { PostJournalEntriesResult } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { formatCents } from "@/app/javelin/_lib/latestUtils";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * What the last post did, with every entry accounted for: posted, failed, unknown, blocked
 * before sending, or held back because the run stopped. Stays until dismissed.
 */
export function PostRunPanel({
  lastRun,
  dismissAction,
}: {
  lastRun: PostJournalEntriesResult | null;
  dismissAction: () => void;
}) {
  if (!lastRun) return null;

  const posted = lastRun.results.filter((result) => result.outcome === "posted");
  const failed = lastRun.results.filter((result) => result.outcome === "failed");
  const unknown = lastRun.results.filter((result) => result.outcome === "unknown");
  const postedCents = posted.reduce((total, result) => total + result.posting.totalCents, 0);

  return (
    <div className="mb-4 space-y-3 rounded-md border border-border bg-accent/10 p-4">
      <div className="flex flex-wrap gap-6 text-sm">
        <Stat label="Posted" value={`${posted.length} (${formatCents(postedCents)})`} />
        {failed.length > 0 && <Stat label="Failed" value={String(failed.length)} />}
        {unknown.length > 0 && <Stat label="Check in QuickBooks" value={String(unknown.length)} />}
        {lastRun.blockedEntries.length > 0 && (
          <Stat label="Not sent" value={String(lastRun.blockedEntries.length)} />
        )}
        {lastRun.notAttemptedDocNumbers.length > 0 && (
          <Stat label="Held back" value={String(lastRun.notAttemptedDocNumbers.length)} />
        )}
      </div>

      {lastRun.stopReason && (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          {lastRun.stopReason} The rest stay unposted, so you can post them again once you have
          looked at what went wrong.
        </p>
      )}

      {[...failed, ...unknown].length > 0 && (
        <ul className="space-y-2 text-sm">
          {[...failed, ...unknown].map((result) => (
            <li key={result.posting.docNumber}>
              <span className="font-semibold text-foreground">{result.posting.docNumber}</span>{" "}
              <span className="text-muted-foreground">
                {result.posting.txnDate}, {formatCents(result.posting.totalCents)}: {result.outcome}
              </span>
              {result.posting.postMessage && (
                <div className="text-xs text-muted-foreground">{result.posting.postMessage}</div>
              )}
            </li>
          ))}
        </ul>
      )}

      {lastRun.blockedEntries.length > 0 && (
        <ul className="space-y-2 text-sm">
          {lastRun.blockedEntries.map((blocked) => (
            <li key={blocked.docNumber}>
              <span className="font-semibold text-foreground">{blocked.docNumber}</span>{" "}
              <span className="text-muted-foreground">not sent</span>
              <div className="text-xs text-destructive">{blocked.problems.join(" ")}</div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="primary" intensity="soft" onClick={dismissAction}>
        Dismiss
      </Button>
    </div>
  );
}
