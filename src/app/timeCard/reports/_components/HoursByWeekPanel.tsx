"use client";

import { useSelector } from "react-redux";
import { Download } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Button } from "@/style/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { cn } from "@/style/utils";
import { timeCardReportsActions } from "@/app/timeCard/reports/timeCardReportsSlice";
import { timeCardReportsSelect } from "@/app/timeCard/reports/timeCardReportsSelect";
import { buildHoursByWeekCsv } from "@/app/timeCard/reports/hoursByWeek";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { downloadTextFile } from "@/lib/misc/downloadTextFile";

export function HoursByWeekPanel() {
  const dispatch = useAppDispatch();
  const dateRange = useSelector(timeCardReportsSelect.dateRange);
  const hoursByWeek = useSelector(timeCardReportsSelect.hoursByWeek);

  const isDateRangeValid = dateRanges.isValidDateRange(dateRange);

  const handleRunReport = () => {
    dispatch(
      timeCardReportsActions.getPunches({
        params: { dateRange: dateRanges.expandToFullWeeks(dateRange) },
        config: { loadingMsg: "Loading time cards..." },
      }),
    );
  };

  const handleDownload = () => {
    const fullWeeks = dateRanges.expandToFullWeeks(dateRange);
    downloadTextFile({
      text: buildHoursByWeekCsv(hoursByWeek),
      fileName: `hours-by-week-${fullWeeks.min}-to-${fullWeeks.max}.csv`,
      mimeType: "text/csv",
    });
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              dispatch(timeCardReportsActions.setDateRange(range))
            }
            size="sm"
          />
          <Button
            variant="primary"
            intensity="solid"
            size="sm"
            disabled={!isDateRangeValid}
            onClick={handleRunReport}
          >
            Run Report
          </Button>
          <Button
            variant="outline"
            intensity="soft"
            size="sm"
            disabled={hoursByWeek.length === 0}
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV
          </Button>
        </div>

        {hoursByWeek.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Hours by week · whole Sunday–Saturday weeks
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Week</TableHead>
                    <TableHead className="text-xs text-right">Reg</TableHead>
                    <TableHead className="text-xs text-right">OT</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursByWeek.map((row) => (
                    <TableRow key={`${row.employeeId}|${row.weekStart}`}>
                      <TableCell className="text-xs">{row.employeeName}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.weekRange}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {row.regHours.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-xs text-right font-mono",
                          row.otHours > 0 && "text-secondary font-semibold",
                        )}
                      >
                        {row.otHours.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {row.totalHours.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {hoursByWeek.length === 0 && isDateRangeValid && (
          <p className="text-sm text-muted-foreground">
            No time cards loaded. Run the report to see hours by week.
          </p>
        )}
      </div>
    </div>
  );
}
