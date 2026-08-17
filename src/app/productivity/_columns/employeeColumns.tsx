"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { GapCell } from "@/app/productivity/_components/GapCell";
import { EmployeeProductivityRow } from "@/app/productivity/productivitySelect";

// ---------------------------------------------------------------------------
// Derived metric helpers
// ---------------------------------------------------------------------------

function perHour(value: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return value / (totalMinutes / 60);
}

// ---------------------------------------------------------------------------
// Column definitions for EmployeeProductivityRow
// ---------------------------------------------------------------------------

export const employeeColumns: ColumnDef<EmployeeProductivityRow>[] = [
  {
    id: "name",
    size: 160,
    meta: { isFluid: true },
    header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
    accessorFn: (row) => row.employee?.name ?? row.employeeId,
    cell: ({ row }) => (
      <Link
        href={`/productivity/byEmployee/${row.original.employeeId}`}
        className="flex items-center gap-1 text-primary hover:underline font-medium"
      >
        {row.original.employee?.name ?? row.original.employeeId}
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    ),
  },
  {
    id: "stops",
    size: 80,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Stops" />,
    accessorFn: (row) => row.totals.wholeCount,
    cell: ({ row }) => <Number>{row.original.totals.wholeCount}</Number>,
  },
  {
    id: "revenue",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Revenue" />,
    accessorFn: (row) => row.totals.revenue,
    cell: ({ row }) => <Number isMoney decimals={0}>{row.original.totals.revenue}</Number>,
  },
  {
    id: "size",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Size" />,
    accessorFn: (row) => row.totals.size,
    cell: ({ row }) => <Number decimals={0}>{row.original.totals.size}</Number>,
  },
  {
    id: "hours",
    size: 80,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Hours" />,
    accessorFn: (row) => row.labor?.totalMinutes ?? 0,
    cell: ({ row }) => {
      const minutes = row.original.labor?.totalMinutes ?? 0;
      return minutes > 0
        ? <span className="font-mono text-xs">{minutesToHoursMinutes(minutes)}</span>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "revenuePerHour",
    size: 100,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Hr" />,
    accessorFn: (row) => row.labor ? perHour(row.totals.revenue, row.labor.totalMinutes) : 0,
    cell: ({ row }) => {
      const minutes = row.original.labor?.totalMinutes ?? 0;
      return minutes > 0
        ? <Number isMoney decimals={0}>{perHour(row.original.totals.revenue, minutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "sizePerHour",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Size/Hr" />,
    accessorFn: (row) => row.labor ? perHour(row.totals.size, row.labor.totalMinutes) : 0,
    cell: ({ row }) => {
      const minutes = row.original.labor?.totalMinutes ?? 0;
      return minutes > 0
        ? <Number decimals={1}>{perHour(row.original.totals.size, minutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "stopsPerHour",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Stops/Hr" />,
    accessorFn: (row) => row.labor ? perHour(row.totals.wholeCount, row.labor.totalMinutes) : 0,
    cell: ({ row }) => {
      const minutes = row.original.labor?.totalMinutes ?? 0;
      return minutes > 0
        ? <Number decimals={2}>{perHour(row.original.totals.wholeCount, minutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "completion",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Completion" />,
    accessorFn: (row) => row.completion?.pct ?? 0,
    cell: ({ row }) => {
      const c = row.original.completion;
      if (!c || c.assigned === 0) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <span className="text-xs">
          {c.completed}/{c.assigned} ({Math.round(c.pct * 100)}%)
        </span>
      );
    },
  },
  {
    id: "beforeFirst",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Before 1st" />,
    accessorFn: (row) => row.routeGaps?.beforeFirstStop ?? null,
    cell: ({ row }) => {
      const gaps = row.original.routeGaps;
      if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <GapCell
          minutes={gaps.beforeFirstStop}
          missingPunchDates={gaps.missingPunchDates}
          daysTotal={gaps.daysTotal}
        />
      );
    },
  },
  {
    id: "between",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Between" />,
    accessorFn: (row) => row.routeGaps?.betweenStops ?? null,
    cell: ({ row }) => {
      const gaps = row.original.routeGaps;
      if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <GapCell
          minutes={gaps.betweenStops}
          missingPunchDates={gaps.missingPunchDates}
          daysTotal={gaps.daysTotal}
        />
      );
    },
  },
  {
    id: "avgBetween",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Avg Between" />,
    accessorFn: (row) =>
      row.routeGaps && row.routeGaps.gapCount > 0 && row.routeGaps.betweenStops !== null
        ? row.routeGaps.betweenStops / row.routeGaps.gapCount
        : null,
    cell: ({ row }) => {
      const gaps = row.original.routeGaps;
      if (!gaps || gaps.gapCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <GapCell
          minutes={gaps.betweenStops}
          missingPunchDates={gaps.missingPunchDates}
          daysTotal={gaps.daysTotal}
          gapCount={gaps.gapCount}
        />
      );
    },
  },
  {
    id: "afterLast",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="After Last" />,
    accessorFn: (row) => row.routeGaps?.afterLastStop ?? null,
    cell: ({ row }) => {
      const gaps = row.original.routeGaps;
      if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <GapCell
          minutes={gaps.afterLastStop}
          missingPunchDates={gaps.missingPunchDates}
          daysTotal={gaps.daysTotal}
        />
      );
    },
  },
];
