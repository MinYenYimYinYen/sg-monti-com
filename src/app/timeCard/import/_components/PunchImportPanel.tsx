"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { parsePunches } from "@/app/timeCard/import/timeCardParser";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { getWeekNumber } from "@/lib/primatives/dates/getWeek";
import { TimeCard } from "@/app/timeCard/TimeCard";
import { timeCardImportActions } from "@/app/timeCard/import/timeCardImportSlice";
import { timeCardImportSelect } from "@/app/timeCard/import/timeCardImportSelect";
import { defaultTimeCardPolicy } from "@/app/timeCard/timeCardPolicy";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/style/components/button";
import { SaveButton } from "@/components/SaveButton";
import { Checkbox } from "@/style/components/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

/**
 * Logs all punchId groups that appear more than once in the parsed data.
 * Used to investigate duplicate-key behavior from the RealGreen CSV export.
 * Remove once the duplicate pattern is fully understood and handled.
 */
function logDuplicatePunchIds(punches: Punch[]): void {
  const multiSegment = punches.filter((p) => p.segments.length > 1);
  if (multiSegment.length === 0) return;
  console.log(`[TimeCard] ${multiSegment.length} punch(es) with multiple segments:`);
  for (const punch of multiSegment) {
    console.log(`  punchId ${punch.punchId} (${punch.employeeId} ${punch.punchDate}):`, punch.segments);
  }
}

// ---------------------------------------------------------------------------
// ParseErrorList
// ---------------------------------------------------------------------------

function ParseErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-semibold text-destructive">
          CSV parse failed — {errors.length} error{errors.length !== 1 ? "s" : ""}
        </span>
      </div>
      <ul className="space-y-1">
        {errors.map((error, i) => (
          <li key={i} className="text-xs text-destructive font-mono">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InvalidCallout
// ---------------------------------------------------------------------------

function InvalidCallout({ punches }: { punches: Punch[] }) {
  if (punches.length === 0) return null;

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-semibold text-foreground">
          {punches.length} invalid punch{punches.length !== 1 ? "es" : ""} — cannot be imported
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        These records have missing clock-in/out times or overlapping segments. They are excluded from import.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Segments</TableHead>
              <TableHead className="text-xs">Issue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {punches.map((punch) => {
              const hasMissing = punch.segments.some(
                (seg) => seg.inTime === "" || seg.outTime === "",
              );
              const hasOverlap = !hasMissing && punch.segments.length > 1;
              const issue = hasMissing ? "Missing clock-in/out" : hasOverlap ? "Overlapping segments" : "Invalid";

              return (
                <TableRow key={punch.punchId} className="bg-destructive/5">
                  <TableCell className="text-xs font-mono">{punch.employeeId}</TableCell>
                  <TableCell className="text-xs">
                    {prettyDate(punch.punchDate, "EEE M/d", { fallback: punch.punchDate })}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-destructive">
                    <div className="flex flex-col gap-0.5">
                      {punch.segments.map((seg, i) => (
                        <span key={i}>{formatTime(seg.inTime)}–{formatTime(seg.outTime)}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{issue}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuspectCallout
// ---------------------------------------------------------------------------

function SuspectCallout({
  punches,
  skippedIds,
  onToggleSkip,
}: {
  punches: Punch[];
  skippedIds: Set<number>;
  onToggleSkip: (punchId: number) => void;
}) {
  if (punches.length === 0) return null;

  // Sort by employeeId ascending, then punchDate ascending
  const sorted = [...punches].sort((a, b) => {
    const empCmp = a.employeeId.localeCompare(b.employeeId);
    return empCmp !== 0 ? empCmp : a.punchDate.localeCompare(b.punchDate);
  });

  return (
    <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-secondary-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">
          {punches.length} suspect punch{punches.length !== 1 ? "es" : ""} — review before importing
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        These records have sentinel times or multiple segments (split shifts). Check to include in import.
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-10">Import</TableHead>
              <TableHead className="text-xs">Employee</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Segments</TableHead>
              <TableHead className="text-xs">Issue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((punch) => {
              const isSkipped = skippedIds.has(punch.punchId);
              const isMultiSegment = punch.segments.length > 1;
              const hasSentinelIn = punch.segments.some(
                (seg) => seg.inTime === defaultTimeCardPolicy.suspectInTime,
              );
              const hasSentinelOut = punch.segments.some(
                (seg) => seg.outTime === defaultTimeCardPolicy.suspectOutTime,
              );

              const issue = isMultiSegment
                ? `Split shift (${punch.segments.length} segments)`
                : hasSentinelIn && hasSentinelOut
                  ? "Auto in + out"
                  : hasSentinelIn
                    ? "Auto punch-in"
                    : "Auto punch-out";

              return (
                <TableRow
                  key={punch.punchId}
                  className={cn("bg-secondary/5", isSkipped && "opacity-50")}
                >
                  <TableCell className="text-xs">
                    <Checkbox
                      checked={!isSkipped}
                      onCheckedChange={() => onToggleSkip(punch.punchId)}
                      aria-label={`Include punch ${punch.punchId}`}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-mono">{punch.employeeId}</TableCell>
                  <TableCell className="text-xs">
                    {prettyDate(punch.punchDate, "EEE M/d", { fallback: punch.punchDate })}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div className="flex flex-col gap-0.5">
                      {punch.segments.map((seg, i) => {
                        const isBadIn = seg.inTime === defaultTimeCardPolicy.suspectInTime;
                        const isBadOut = seg.outTime === defaultTimeCardPolicy.suspectOutTime;
                        return (
                          <span key={i}>
                            <span className={cn(isBadIn && "text-destructive font-semibold")}>
                              {formatTime(seg.inTime)}
                            </span>
                            {"–"}
                            <span className={cn(isBadOut && "text-destructive font-semibold")}>
                              {formatTime(seg.outTime)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{issue}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImportSummary
// ---------------------------------------------------------------------------

function ImportSummary({ punches }: { punches: Punch[] }) {
  const employeeCount = new Set(punches.map((p) => p.employeeId)).size;
  const dates = punches.map((p) => p.punchDate).sort();
  const minDate = dates[0] ?? "—";
  const maxDate = dates[dates.length - 1] ?? "—";

  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Punches</span>
        <span className="font-semibold text-foreground">{punches.length}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Employees</span>
        <span className="font-semibold text-foreground">{employeeCount}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Date Range</span>
        <span className="font-semibold text-foreground">
          {minDate === maxDate ? minDate : `${minDate} → ${maxDate}`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PunchPreviewTable
// ---------------------------------------------------------------------------

function PunchPreviewTable({
  punches,
  invalidIds,
  suspectIds,
  skippedIds,
}: {
  punches: Punch[];
  invalidIds: Set<number>;
  suspectIds: Set<number>;
  skippedIds: Set<number>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">ID</TableHead>
            <TableHead className="text-xs">Employee</TableHead>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Segments</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...punches]
            .sort((a, b) => {
              const empCmp = a.employeeId.localeCompare(b.employeeId);
              return empCmp !== 0 ? empCmp : a.punchDate.localeCompare(b.punchDate);
            })
            .map((punch) => {
              const isInvalid = invalidIds.has(punch.punchId);
              const isSuspect = suspectIds.has(punch.punchId);
              const isSkipped = skippedIds.has(punch.punchId);
              const isEvenWeek = getWeekNumber(punch.punchDate) % 2 === 0;
              return (
                <TableRow
                  key={punch.punchId}
                  className={cn(
                    isInvalid && "bg-destructive/5",
                    isSuspect && !isInvalid && !isSkipped && "bg-secondary/10",
                    isSkipped && "opacity-40 line-through",
                    !isInvalid && !isSuspect && !isSkipped && isEvenWeek && "bg-accent/5",
                  )}
                >
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {punch.punchId}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{punch.employeeId}</TableCell>
                  <TableCell className="text-xs">
                    {prettyDate(punch.punchDate, "EEE M/d", { fallback: punch.punchDate })}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {punch.segments.map((seg, i) => {
                      const isBadIn = seg.inTime === "" || seg.inTime === defaultTimeCardPolicy.suspectInTime;
                      const isBadOut = seg.outTime === "" || seg.outTime === defaultTimeCardPolicy.suspectOutTime;
                      return (
                        <span key={i} className={i > 0 ? "ml-2" : ""}>
                          <span className={cn(isBadIn && "text-destructive font-semibold")}>
                            {formatTime(seg.inTime)}
                          </span>
                          {"–"}
                          <span className={cn(isBadOut && "text-destructive font-semibold")}>
                            {formatTime(seg.outTime)}
                          </span>
                          {i < punch.segments.length - 1 && ","}
                        </span>
                      );
                    })}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PunchImportPanel
// ---------------------------------------------------------------------------

export function PunchImportPanel() {
  const dispatch = useAppDispatch();
  const importStage = useSelector(timeCardImportSelect.importStage);
  const saveStatus = useSelector(timeCardImportSelect.saveStatus);
  const punches = useSelector(timeCardImportSelect.all);
  const skippedIds = useSelector(timeCardImportSelect.skippedPunchIdsSet);

  const handleFileDrop = async (file: File) => {
    dispatch(timeCardImportActions.setSaveStatus("idle"));
    const parseResult = await parsePunches(file);

    if (!parseResult.success) {
      dispatch(timeCardImportActions.setCsvRows([]));
      dispatch(timeCardImportActions.setSkippedPunchIds([]));
      dispatch(
        timeCardImportActions.setImportStage({
          stage: "errors",
          fileName: file.name,
          errors: parseResult.errors,
        }),
      );
      return;
    }

    const parsed = parseResult.data;
    logDuplicatePunchIds(parsed);

    const timeCardForSkip = new TimeCard(parsed);

    // Auto-skip invalid punches (cannot be imported) + all suspect punches by default.
    // User must explicitly check a suspect punch to include it.
    const autoSkipped = [
      ...timeCardForSkip.invalidPunches.map((p) => p.punchId),
      ...timeCardForSkip.suspectPunches.map((p) => p.punchId),
    ];

    dispatch(timeCardImportActions.setCsvRows(parsed));
    dispatch(timeCardImportActions.setSkippedPunchIds(autoSkipped));
    dispatch(
      timeCardImportActions.setImportStage({
        stage: "preview",
        fileName: file.name,
        warnings: parseResult.warnings ?? [],
      }),
    );
  };

  const handleToggleSkip = (punchId: number) => {
    const next = new Set(skippedIds);
    if (next.has(punchId)) {
      next.delete(punchId);
    } else {
      next.add(punchId);
    }
    dispatch(timeCardImportActions.setSkippedPunchIds(Array.from(next)));
  };

  const handleImport = async () => {
    if (importStage.stage !== "preview") return;

    const toImport = punches.filter((p) => !skippedIds.has(p.punchId));
    if (toImport.length === 0) return;

    dispatch(timeCardImportActions.setSaveStatus("saving"));
    dispatch(
      timeCardImportActions.importPunches({
        params: { punches: toImport },
        config: { force: true, loadingMsg: "Importing punches..." },
      }),
    );
  };

  const handleReset = () => {
    dispatch(timeCardImportActions.resetImport());
  };

  // ---------------------------------------------------------------------------
  // Render: idle
  // ---------------------------------------------------------------------------

  if (importStage.stage === "idle") {
    return (
      <div className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Import Punches</h2>
          <p className="text-sm text-muted-foreground">
            Drop the time card CSV exported from RealGreen. Required columns:{" "}
            <span className="font-mono text-xs">TimeHeadId</span>,{" "}
            <span className="font-mono text-xs">EmployeeId</span>,{" "}
            <span className="font-mono text-xs">ReportDate</span>,{" "}
            <span className="font-mono text-xs">InOutTimeFormatted</span>.
          </p>
        </div>
        <CSVDropzone onFileDrop={handleFileDrop} className="h-36" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: errors
  // ---------------------------------------------------------------------------

  if (importStage.stage === "errors") {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-mono">{importStage.fileName}</span>
          <Button variant="outline" intensity="soft" onClick={handleReset}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Try another file
          </Button>
        </div>
        <ParseErrorList errors={importStage.errors} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: result
  // ---------------------------------------------------------------------------

  if (importStage.stage === "result") {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              Import complete — {importStage.imported} record{importStage.imported !== 1 ? "s" : ""} saved
            </span>
          </div>
          {importStage.apiErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {importStage.apiErrors.map((error, i) => (
                <li key={i} className="text-xs text-destructive font-mono">
                  {error}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" onClick={handleReset}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import another file
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: preview
  // ---------------------------------------------------------------------------

  const { fileName, warnings } = importStage;
  const timeCard = new TimeCard(punches);
  const invalidPunches = timeCard.invalidPunches;
  const suspectPunches = timeCard.suspectPunches;
  const invalidIds = new Set(invalidPunches.map((p) => p.punchId));
  const suspectIds = new Set(suspectPunches.map((p) => p.punchId));

  const importableCount = punches.filter((p) => !skippedIds.has(p.punchId)).length;
  const totalCount = punches.length;

  return (
    <div className="max-w-3xl space-y-5">
      {/* File name + reset */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-mono">{fileName}</span>
        <Button variant="outline" intensity="soft" size="sm" onClick={handleReset}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload different file
        </Button>
      </div>

      {/* Summary stats */}
      <ImportSummary punches={punches} />

      {/* Parse warnings */}
      {warnings.length > 0 && (
        <div className="rounded-md border border-muted bg-muted/20 p-3 space-y-1">
          {warnings.map((warning, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              ⚠ {warning}
            </p>
          ))}
        </div>
      )}

      {/* Accordion: Invalid → Suspect → Import (only non-empty sections render) */}
      {(() => {
        // Build the ordered list of visible sections
        type SectionId = "invalid" | "suspect" | "import";
        const sections: SectionId[] = [];
        if (invalidPunches.length > 0) sections.push("invalid");
        if (suspectPunches.length > 0) sections.push("suspect");
        sections.push("import");

        const defaultOpen = sections[0]!;

        return (
          <Accordion type="single" collapsible defaultValue={defaultOpen}>
            {sections.includes("invalid") && (
              <AccordionItem value="invalid">
                <AccordionTrigger>
                  <span className="text-sm font-medium text-foreground">
                    {invalidPunches.length} Invalid Punch{invalidPunches.length !== 1 ? "es" : ""} — Cannot Import
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <InvalidCallout punches={invalidPunches} />
                </AccordionContent>
              </AccordionItem>
            )}

            {sections.includes("suspect") && (
              <AccordionItem value="suspect">
                <AccordionTrigger>
                  <span className="text-sm font-medium text-foreground">
                    {suspectPunches.length} Suspect Punch{suspectPunches.length !== 1 ? "es" : ""} — Review Before Importing
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <SuspectCallout
                    punches={suspectPunches}
                    skippedIds={skippedIds}
                    onToggleSkip={handleToggleSkip}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="import">
              <AccordionTrigger>
                <span className="text-sm font-medium text-foreground">
                  {importableCount === totalCount
                    ? `${importableCount} Punch${importableCount !== 1 ? "es" : ""} to Import`
                    : `${importableCount} of ${totalCount} Punches to Import`}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {invalidIds.size > 0 || suspectIds.size > 0
                      ? "Red rows are invalid (excluded). Orange rows are suspect. Strikethrough rows will be skipped."
                      : "All punch records look clean."}
                  </p>
                  <PunchPreviewTable
                    punches={punches}
                    invalidIds={invalidIds}
                    suspectIds={suspectIds}
                    skippedIds={skippedIds}
                  />
                  <div className="flex items-center gap-3">
                    <SaveButton
                      status={saveStatus}
                      disabled={importableCount === 0}
                      onClick={handleImport}
                      onSuccessComplete={() => dispatch(timeCardImportActions.setSaveStatus("idle"))}
                    >
                      Import{" "}
                      {importableCount === totalCount
                        ? `${importableCount} Punch${importableCount !== 1 ? "es" : ""}`
                        : `${importableCount} of ${totalCount} Punches`}
                    </SaveButton>
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })()}
    </div>
  );
}
