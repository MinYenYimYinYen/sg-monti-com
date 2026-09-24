"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/style/components/button";
import { timeCardPayrollActions } from "@/app/timeCard/payroll/timeCardPayrollSlice";
import {
  timeCardPayrollSelect,
  EmployeeSummary,
} from "@/app/timeCard/payroll/timeCardPayrollSelect";
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
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Formatter = (minutes: number) => string;

function makeFormatter(showDecimal: boolean): Formatter {
  if (showDecimal) {
    return (minutes) => (minutes / 60).toFixed(2);
  }
  return minutesToHoursMinutes;
}

function formatTime(time: string): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

function formatSegments(punch: Punch): string {
  return punch.segments
    .map((seg) => `${formatTime(seg.inTime)}–${formatTime(seg.outTime)}`)
    .join(", ");
}

/** Renders "value / runningTotal" with the running total subtly muted. */
function RunningCell({
  value,
  running,
  accent = false,
  fmt,
}: {
  value: number;
  running: number;
  accent?: boolean;
  fmt: Formatter;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 justify-end w-full">
      <span className={cn("font-mono", accent && value > 0 && "text-secondary font-semibold")}>
        {fmt(value)}
      </span>
      <span className="text-muted-foreground/50 font-mono text-[10px]">
        / {fmt(running)}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// EmployeeAccordionItem
// ---------------------------------------------------------------------------

function EmployeeAccordionItem({
  summary,
  fmt,
}: {
  summary: EmployeeSummary;
  fmt: Formatter;
}) {
  const {
    employeeId,
    nameLastFirst,
    punches,
    regularMinutes,
    overtimeMinutes,
    totalMinutes,
    minutesByDate,
    regularMinutesByDate,
    overtimeMinutesByDate,
    hasSuspectPunches,
    hasInvalidPunches,
    suspectPunches,
  } = summary;
  const hasFlags = hasSuspectPunches || hasInvalidPunches;
  const suspectPunchIds = new Set(suspectPunches.map((p) => p.punchId));

  // Sort punches by date ascending
  const sortedPunches = [...punches].sort((a, b) =>
    a.punchDate.localeCompare(b.punchDate),
  );

  // Compute running totals in date order
  let runningHours = 0;
  let runningReg = 0;
  let runningOt = 0;

  return (
    <AccordionItem value={employeeId}>
      <AccordionTrigger>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground w-48 text-left">
            {nameLastFirst}
          </span>
          <span className="text-muted-foreground">
            Reg:{" "}
            <span className="text-foreground font-medium">
              {fmt(regularMinutes)}
            </span>
          </span>
          <span className="text-muted-foreground">
            OT:{" "}
            <span
              className={cn(
                "font-medium",
                overtimeMinutes > 0
                  ? "text-secondary"
                  : "text-foreground",
              )}
            >
              {fmt(overtimeMinutes)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Total:{" "}
            <span className="text-foreground font-medium">
              {fmt(totalMinutes)}
            </span>
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
              ⚠{" "}
              {hasSuspectPunches &&
                `${suspectPunches.length} suspect punch${suspectPunches.length !== 1 ? "es" : ""}`}
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
                  <TableHead className="text-xs text-right">Reg</TableHead>
                  <TableHead className="text-xs text-right">OT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPunches.map((punch) => {
                  const dayMinutes = minutesByDate.get(punch.punchDate) ?? 0;
                  const dayReg = regularMinutesByDate.get(punch.punchDate) ?? 0;
                  const dayOt = overtimeMinutesByDate.get(punch.punchDate) ?? 0;
                  const isSuspect = suspectPunchIds.has(punch.punchId);

                  runningHours += dayMinutes;
                  runningReg += dayReg;
                  runningOt += dayOt;

                  return (
                    <TableRow
                      key={punch.punchId}
                      className={cn(isSuspect && "bg-secondary/10")}
                    >
                      <TableCell className="text-xs">
                        {prettyDate(punch.punchDate, "EEE M/d", {
                          fallback: punch.punchDate,
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatSegments(punch)}
                        {isSuspect && (
                          <AlertTriangle className="inline h-3 w-3 ml-1 text-secondary-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <RunningCell value={dayMinutes} running={runningHours} fmt={fmt} />
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <RunningCell value={dayReg} running={runningReg} fmt={fmt} />
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <RunningCell value={dayOt} running={runningOt} accent fmt={fmt} />
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
                    {fmt(totalMinutes)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {fmt(regularMinutes)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {overtimeMinutes > 0 ? (
                      <span className="text-secondary">
                        {fmt(overtimeMinutes)}
                      </span>
                    ) : (
                      fmt(overtimeMinutes)
                    )}
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
  const [showDecimal, setShowDecimal] = useState(false);
  const dateRange = useSelector(timeCardPayrollSelect.dateRange);
  const employeeSummaries = useSelector(
    timeCardPayrollSelect.employeeSummaries,
  );
  const punches = useSelector(timeCardPayrollSelect.punches);

  const fmt = makeFormatter(showDecimal);
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
    <div className="px-4 py-6">
      <div className="max-w-3xl space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              dispatch(timeCardPayrollActions.setDateRange(range))
            }
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
          <Button
            variant="outline"
            intensity="soft"
            size="sm"
            onClick={() => setShowDecimal((prev) => !prev)}
          >
            {showDecimal ? "h:mm" : "decimal"}
          </Button>
        </div>

        {/* Results */}
        {punches.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {punches.length} punch{punches.length !== 1 ? "es" : ""} ·{" "}
              {employeeSummaries.length} employee
              {employeeSummaries.length !== 1 ? "s" : ""}
            </p>
            <Accordion type="multiple">
              {employeeSummaries.map((summary) => (
                <EmployeeAccordionItem
                  key={summary.employeeId}
                  summary={summary}
                  fmt={fmt}
                />
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
