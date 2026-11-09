"use client";
import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { useJavelin } from "@/app/javelin/useJavelin";
import {
  JavelinMigrationLine,
  JavelinMigrationStatus,
} from "@/app/javelin/migration/JavelinMigrationTypes";

const statusDisplay: Record<
  JavelinMigrationStatus,
  { label: string; variant: "accent" | "primary" | "destructive"; intensity: "soft" | "ghost" }
> = {
  create: { label: "Will link", variant: "accent", intensity: "soft" },
  alreadyMapped: { label: "Already linked", variant: "primary", intensity: "ghost" },
  unmatched: { label: "No match", variant: "destructive", intensity: "soft" },
  conflict: { label: "Conflict", variant: "destructive", intensity: "soft" },
};

function MigrationTable({ title, lines }: { title: string; lines: JavelinMigrationLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Old entry</TableHead>
            <TableHead className="w-28">Links under</TableHead>
            <TableHead>QuickBooks account</TableHead>
            <TableHead className="w-40">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => {
            const display = statusDisplay[line.status];
            return (
              <TableRow key={`${line.source}:${line.targetKey}`}>
                <TableCell>{line.source}</TableCell>
                <TableCell>{line.targetKey}</TableCell>
                <TableCell noTruncate>
                  {line.qboAccountLabel ?? ""}
                  {line.note && <div className="text-xs text-muted-foreground">{line.note}</div>}
                </TableCell>
                <TableCell noTruncate>
                  <Badge variant={display.variant} intensity={display.intensity}>
                    {display.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * One-time move of the old name-based mappings (kept in global settings) to QuickBooks Id links.
 * Check first: nothing is written until Apply. Existing links are never overwritten, and the old
 * mappings stay in place so nothing is lost.
 */
export function MigrationPanel() {
  const report = useSelector(javelinSelect.migrationReport);
  const { migrateMappings } = useJavelin({ autoLoad: false });
  const willLinkCount = report
    ? [...report.genLedger, ...report.deposit].filter((line) => line.status === "create").length
    : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Javelin used to remember QuickBooks account names. It now links accounts by QuickBooks Id,
        shared with the Account Mapping page. Check what would be linked, then apply. Accounts with
        no match are left for you to link by hand on the Account Mapping page.
      </p>

      <div className="flex gap-3">
        <Button variant="primary" intensity="solid" onClick={() => migrateMappings({ apply: false })}>
          Check
        </Button>
        <Button
          variant="accent"
          intensity="solid"
          disabled={!report || report.applied || willLinkCount === 0}
          onClick={() => migrateMappings({ apply: true })}
        >
          Apply {willLinkCount > 0 ? `(${willLinkCount} links)` : ""}
        </Button>
      </div>

      {report?.applied && (
        <p className="text-sm text-foreground">
          Created {report.createdCount} link{report.createdCount === 1 ? "" : "s"}.
        </p>
      )}

      {report && (
        <>
          <MigrationTable title="General ledger accounts" lines={report.genLedger} />
          <MigrationTable title="Deposit fields" lines={report.deposit} />
        </>
      )}
    </div>
  );
}
