"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Checkbox } from "@/style/components/checkbox";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { importCCTxnSelect } from "@/app/qbo/importCCTxn/importCCTxnSelect";
import { useImportRow } from "@/app/qbo/importCCTxn/rows/useImportRow";
import { formatCents, skipReasonLabels } from "@/app/qbo/importCCTxn/_lib/importFileUtils";
import { ImportRowSkipReason } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

/** What the server says the import would do: new, already imported, skipped, look-alikes. */
export function ImportPreviewSummary() {
  const preview = useSelector(importRowSelect.preview);
  const fileSummary = useSelector(importCCTxnSelect.fileSummary);
  const confirmedRowNumbers = useSelector(importRowSelect.confirmedDuplicateRowNumberSet);
  const { setConfirmedDuplicateRowNumbers } = useImportRow({ autoLoad: false });

  if (!preview || !fileSummary) return null;

  const skippedEntries = Object.entries(preview.skippedCounts) as [ImportRowSkipReason, number][];

  const toggleDuplicate = (rowNumber: number) => {
    const next = new Set(confirmedRowNumbers);
    if (next.has(rowNumber)) next.delete(rowNumber);
    else next.add(rowNumber);
    setConfirmedDuplicateRowNumbers([...next]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-6 text-sm">
        <Stat label="Rows in file" value={String(fileSummary.rowCount)} />
        <Stat
          label="Dates"
          value={
            fileSummary.minTransactionDate === fileSummary.maxTransactionDate
              ? fileSummary.minTransactionDate
              : `${fileSummary.minTransactionDate} to ${fileSummary.maxTransactionDate}`
          }
        />
        <Stat
          label="Charges"
          value={`${fileSummary.chargeCount} (${formatCents(fileSummary.chargeTotalCents)})`}
        />
        <Stat label="New" value={String(preview.newCount)} />
        <Stat label="Already imported" value={String(preview.duplicateCount)} />
      </div>

      {skippedEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Stored as skipped:</span>
          {skippedEntries.map(([reason, count]) => (
            <Badge key={reason} variant="secondary" intensity="soft">
              {skipReasonLabels[reason]}: {count}
            </Badge>
          ))}
        </div>
      )}

      {preview.possibleDuplicates.length > 0 && (
        <div className="rounded-md border border-secondary/50 bg-secondary/10 p-4">
          <div className="mb-1 text-sm font-semibold text-foreground">
            {preview.possibleDuplicates.length} possible duplicate
            {preview.possibleDuplicates.length === 1 ? "" : "s"}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            These match an imported transaction&apos;s card, amount and date, but not its
            description or posted date. Check the ones that really are duplicates to leave them out.
            Unchecked rows are imported normally.
          </p>
          <ul className="space-y-2">
            {preview.possibleDuplicates.map((possibleDuplicate) => (
              <li key={possibleDuplicate.rowNumber}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox
                    checked={confirmedRowNumbers.has(possibleDuplicate.rowNumber)}
                    onCheckedChange={() => toggleDuplicate(possibleDuplicate.rowNumber)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Row {possibleDuplicate.rowNumber}
                  </span>
                  <span className="text-foreground">
                    {prettyDate(possibleDuplicate.transactionDate, "M/d/yyyy", {
                      fallback: possibleDuplicate.transactionDate,
                    })}
                  </span>
                  <span className="font-mono text-xs text-foreground">
                    {possibleDuplicate.description}
                  </span>
                  <span className="text-foreground">
                    {formatCents(possibleDuplicate.amountCents)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
