"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/style/components/button";
import { timeCardPayrollActions } from "@/app/timeCard/payroll/timeCardPayrollSlice";
import { timeCardPayrollSelect, EmployeeSummary } from "@/app/timeCard/payroll/timeCardPayrollSelect";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { defaultTimeCardPolicy } from "@/app/timeCard/timeCardPolicy";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

function formatSegments(punch: Punch): string {
  return punch.segments
    .map((seg) => `${formatTime(seg.inTime)}–${formatTime(seg.outTime)}`)
    .join(", ");
}

function isSuspectPunch(punch: Punch): boolean {
  return punch.segments.some(
    (seg) =>
      seg.inTime === defaultTimeCardPolicy.suspectInTime ||
      seg.outTime === defaultTimeCardPolicy.suspectOutTime,
  ) || punch.segments.length > 1;
}

// ---------------------------------------------------------------------------
// EmployeeAccordionItem
// ---------------------------------------------------------------------------

function EmployeeAccordionItem({ summary }: { summary: EmployeeSummary }) {
  const { employeeId, punches, regularMinutes, overtimeMinutes, totalMinutes, minutesByDate, hasSuspectPunches, hasInvalidPunches, suspectPunches } = summary;
  const hasFlags = hasSuspectPunches || hasInvalidPunches;
  const suspectPunchIds = new Set(suspectPunches.map((p) => p.punchId));

  // Sort punches by date ascending
  const sortedPunches = [...punches].sort((a, b) => a.punchDate.localeCompare(b.punchDate));

  return (
    <AccordionItem value={employeeId}>
      <AccordionTrigger>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono font-semibold text-foreground w-24 text-left">{employeeId}</span>
          <span className="text-muted-foreground">
            Reg: <span className="text-foreground font-medium">{minutesToHoursMinutes(regularMinutes)}</span>
          </span>
          <span className="text-muted-foreground">
            OT: <span className={cn("font-medium", overtimeMinutes > 0 ? "text-secondary-foreground" : "text-foreground")}>{minutesToHoursMinutes(overtimeMinutes)}</span>
          </span>
          <span className="text-muted-foreground">
            Total: <span className="text-foreground font-medium">{minutesToHoursMinutes(totalMinutes)}</span>
          </span>
          {hasFlags && (
            <AlertTriangle className="h-3.5 w-3.5 text-secondary-foreground shrink-0" />
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          {hasFlags && (
            <p className="text-xs text-muted-foreground">
              ⚠ {hasSuspectPunches && `${suspectPunches.length} suspect punch${suspectPunches.length !== 1 ? "es" : ""}`}
              {hasSuspectPunches && hasInvalidPunches && " · "}
              {hasInvalidPunches && "invalid punches present"}
            </p>
          )}
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Segments</TableHead>
                  <TableHead className="text-xs text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPunches.map((punch) => {
                  const dayMinutes = minutesByDate.get(punch.punchDate) ?? 0;
                  const isSuspect = suspectPunchIds.has(punch.punchId);
                  return (
                    <TableRow
                      key={punch.punchId}
                      className={cn(isSuspect && "bg-secondary/10")}
                    >
                      <TableCell className="text-xs">
                        {prettyDate(punch.punchDate, "EEE M/d", { fallback: punch.punchDate })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatSegments(punch)}
                        {isSuspect && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-secondary-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {minutesToHoursMinutes(dayMinutes)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals row */}
                <TableRow className="bg-accent/5 font-semibold">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {punches.length} day{punches.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {minutesToHoursMinutes(totalMinutes)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ---------------------------------------------------------------------------
// PayrollPanel
// ---------------------------------------------------------------------------

export function PayrollPanel() {
  const dispatch = useAppDispatch();
  const dateRange = useSelector(timeCardPayrollSelect.dateRange);
  const employeeSummaries = useSelector(timeCardPayrollSelect.employeeSummaries);
  const punches = useSelector(timeCardPayrollSelect.punches);

  const isDateRangeValid = dateRange.min !== "" && dateRange.max !== "";

  const handleGetTimeCards = () => {
    dispatch(
      timeCardPayrollActions.getPunches({
        params: { dateRange },
        config: { loadingMsg: "Loading time cards..." },
      }),
    );
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => dispatch(timeCardPayrollActions.setDateRange(range))}
            size="sm"
          />
          <Button
            variant="primary"
            intensity="solid"
            size="sm"
            disabled={!isDateRangeValid}
            onClick={handleGetTimeCards}
          >
            Get Time Cards
          </Button>
        </div>

        {/* Results */}
        {punches.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {punches.length} punch{punches.length !== 1 ? "es" : ""} · {employeeSummaries.length} employee{employeeSummaries.length !== 1 ? "s" : ""}
            </p>
            <Accordion type="multiple">
              {employeeSummaries.map((summary) => (
                <EmployeeAccordionItem key={summary.employeeId} summary={summary} />
              ))}
            </Accordion>
          </div>
        )}

        {punches.length === 0 && isDateRangeValid && (
          <p className="text-sm text-muted-foreground">
            No time cards found for the selected date range.
          </p>
        )}
      </div>
    </div>
  );
}
