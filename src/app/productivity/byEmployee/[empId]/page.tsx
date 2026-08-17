"use client";

import { use } from "react";
import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { Button } from "@/style/components/button";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { productivitySelect, ProductivityTotals, RouteGaps } from "@/app/productivity/productivitySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GapCell } from "@/app/productivity/_components/GapCell";

type Params = { empId: string };

// ---------------------------------------------------------------------------
// Row type — one row per date for this employee
// ---------------------------------------------------------------------------

type DateRow = {
  date: string;
  totals: ProductivityTotals;
  dayMinutes: number;
  routeGaps: RouteGaps | null;
};

// ---------------------------------------------------------------------------
// Derived metrics helpers
// ---------------------------------------------------------------------------

function perHour(value: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return value / (totalMinutes / 60);
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

function buildColumns(empId: string): ColumnDef<DateRow>[] {
  return [
    {
      accessorKey: "date",
      size: 130,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <Link
          href={`/productivity/byEmployee/${empId}/${row.original.date}`}
          className="flex items-center gap-1 text-primary hover:underline font-medium text-xs font-mono"
        >
          {prettyDate(row.original.date, "EEE M/d", { fallback: row.original.date })}
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
    {
      id: "stops",
      size: 80,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Stops" />,
      cell: ({ row }) => <Number>{row.original.totals.wholeCount}</Number>,
    },
    {
      id: "revenue",
      size: 110,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Revenue" />,
      cell: ({ row }) => <Number isMoney decimals={0}>{row.original.totals.revenue}</Number>,
    },
    {
      id: "size",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Size" />,
      cell: ({ row }) => <Number decimals={0}>{row.original.totals.size}</Number>,
    },
    {
      id: "hours",
      size: 80,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Hours" />,
      cell: ({ row }) => (
        row.original.dayMinutes > 0
          ? <span className="font-mono text-xs">{minutesToHoursMinutes(row.original.dayMinutes)}</span>
          : <span className="text-muted-foreground text-xs">—</span>
      ),
    },
    {
      id: "revenuePerHour",
      size: 100,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Hr" />,
      cell: ({ row }) => (
        row.original.dayMinutes > 0
          ? <Number isMoney decimals={0}>{perHour(row.original.totals.revenue, row.original.dayMinutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>
      ),
    },
    {
      id: "sizePerHour",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Size/Hr" />,
      cell: ({ row }) => (
        row.original.dayMinutes > 0
          ? <Number decimals={1}>{perHour(row.original.totals.size, row.original.dayMinutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>
      ),
    },
    {
      id: "stopsPerHour",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Stops/Hr" />,
      cell: ({ row }) => (
        row.original.dayMinutes > 0
          ? <Number decimals={2}>{perHour(row.original.totals.wholeCount, row.original.dayMinutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>
      ),
    },
    {
      id: "beforeFirst",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Before 1st" />,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <GapCell
            minutes={gaps.beforeFirstStop}
            missingPunchDates={gaps.missingPunchDates}
          />
        );
      },
    },
    {
      id: "between",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Between" />,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <GapCell
            minutes={gaps.betweenStops}
            missingPunchDates={gaps.missingPunchDates}
          />
        );
      },
    },
    {
      id: "avgBetween",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="Avg Between" />,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps || gaps.gapCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <GapCell
            minutes={gaps.betweenStops}
            missingPunchDates={gaps.missingPunchDates}
            gapCount={gaps.gapCount}
          />
        );
      },
    },
    {
      id: "afterLast",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="After Last" />,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <GapCell
            minutes={gaps.afterLastStop}
            missingPunchDates={gaps.missingPunchDates}
          />
        );
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ByEmployeeDetailPage({ params }: { params: Promise<Params> }) {
  const { empId } = use(params);

  const byEmployeeByDate = useSelector(productivitySelect.byEmployeeByDate);
  const laborByEmployeeByDate = useSelector(productivitySelect.laborByEmployeeByDate);
  const laborByEmployee = useSelector(productivitySelect.laborByEmployee);
  const routeGapsByEmployeeByDate = useSelector(productivitySelect.routeGapsByEmployeeByDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const employee = employeeMap.get(empId);
  const byDate = byEmployeeByDate.get(empId);
  const minutesByDate = laborByEmployeeByDate.get(empId);
  const gapsByDate = routeGapsByEmployeeByDate.get(empId);
  const totalMinutes = laborByEmployee.get(empId)?.totalMinutes ?? 0;

  const rows: DateRow[] = byDate
    ? Array.from(byDate.entries())
        .map(([date, totals]) => ({
          date,
          totals,
          dayMinutes: minutesByDate?.get(date) ?? 0,
          routeGaps: gapsByDate?.get(date) ?? null,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const columns = buildColumns(empId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header with back button and employee name */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card/50">
        <Button variant="outline" intensity="ghost" size="icon" asChild>
          <Link href="/productivity/byEmployee" aria-label="Back to employees">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">
            {employee?.name ?? empId}
          </span>
          {totalMinutes > 0 && (
            <span className="text-muted-foreground">
              Total hours:{" "}
              <span className="font-mono text-foreground">{minutesToHoursMinutes(totalMinutes)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Date breakdown table */}
      <div className="flex-1 overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed services found for this employee in the selected date range.
          </p>
        ) : (
          <DataGrid
            data={rows}
            columns={columns}
            enableSorting
            enablePagination={false}
            rowVariant="alternating"
          />
        )}
      </div>
    </div>
  );
}
