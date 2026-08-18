"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { GapCell } from "@/app/productivity/_components/GapCell";
import { EmployeeDateProductivityRow } from "@/app/productivity/productivitySelect";

// ---------------------------------------------------------------------------
// Derived metric helpers
// ---------------------------------------------------------------------------

function perHour(value: number, totalMinutes: number): number {
  if (totalMinutes === 0) return 0;
  return value / (totalMinutes / 60);
}

// ---------------------------------------------------------------------------
// Column factory — needs empId to build the drill-down link.
// ---------------------------------------------------------------------------

export function buildEmployeeDateColumns(empId: string): ColumnDef<EmployeeDateProductivityRow>[] {
  return [
    {
      id: "date",
      size: 130,
      meta: { label: "Date" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Date" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.date,
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
      meta: { label: "Stops" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Stops" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.totals.wholeCount,
      cell: ({ row }) => <Number>{row.original.totals.wholeCount}</Number>,
    },
    {
      id: "revenue",
      size: 110,
      meta: { label: "Revenue" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Revenue" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.totals.revenue,
      cell: ({ row }) => <Number isMoney decimals={0}>{row.original.totals.revenue}</Number>,
    },
    {
      id: "size",
      size: 90,
      meta: { label: "Size" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Size" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.totals.size,
      cell: ({ row }) => <Number decimals={0}>{row.original.totals.size}</Number>,
    },
    {
      id: "hours",
      size: 80,
      meta: { label: "Hours" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Hours" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.dayMinutes,
      cell: ({ row }) => {
        const minutes = row.original.dayMinutes;
        return minutes > 0
          ? <span className="font-mono text-xs">{minutesToHoursMinutes(minutes)}</span>
          : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      id: "revenuePerHour",
      size: 100,
      meta: { label: "Rev/Hr" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Hr" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.dayMinutes > 0 ? perHour(row.totals.revenue, row.dayMinutes) : 0,
      cell: ({ row }) => {
        const minutes = row.original.dayMinutes;
        return minutes > 0
          ? <Number isMoney decimals={0}>{perHour(row.original.totals.revenue, minutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      id: "sizePerHour",
      size: 90,
      meta: { label: "Size/Hr" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Size/Hr" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.dayMinutes > 0 ? perHour(row.totals.size, row.dayMinutes) : 0,
      cell: ({ row }) => {
        const minutes = row.original.dayMinutes;
        return minutes > 0
          ? <Number decimals={1}>{perHour(row.original.totals.size, minutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      id: "stopsPerHour",
      size: 90,
      meta: { label: "Stops/Hr" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Stops/Hr" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.dayMinutes > 0 ? perHour(row.totals.wholeCount, row.dayMinutes) : 0,
      cell: ({ row }) => {
        const minutes = row.original.dayMinutes;
        return minutes > 0
          ? <Number decimals={2}>{perHour(row.original.totals.wholeCount, minutes)}</Number>
          : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      id: "beforeFirst",
      size: 90,
      meta: { label: "Before 1st" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Before 1st" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.routeGaps?.beforeFirstStop ?? null,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return <GapCell minutes={gaps.beforeFirstStop} missingPunchDates={gaps.missingPunchDates} />;
      },
    },
    {
      id: "between",
      size: 90,
      meta: { label: "Between" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Between" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.routeGaps?.betweenStops ?? null,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return <GapCell minutes={gaps.betweenStops} missingPunchDates={gaps.missingPunchDates} />;
      },
    },
    {
      id: "avgBetween",
      size: 90,
      meta: { label: "Avg Between" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Avg Between" isSorted={column.getIsSorted()} />,
      accessorFn: (row) =>
        row.routeGaps && row.routeGaps.gapCount > 0 && row.routeGaps.betweenStops !== null
          ? row.routeGaps.betweenStops / row.routeGaps.gapCount
          : null,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps || gaps.gapCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return <GapCell minutes={gaps.betweenStops} missingPunchDates={gaps.missingPunchDates} gapCount={gaps.gapCount} />;
      },
    },
    {
      id: "afterLast",
      size: 90,
      meta: { label: "After Last" },
      header: ({ column }) => <DataGridColumnHeader column={column} title="After Last" isSorted={column.getIsSorted()} />,
      accessorFn: (row) => row.routeGaps?.afterLastStop ?? null,
      cell: ({ row }) => {
        const gaps = row.original.routeGaps;
        if (!gaps) return <span className="text-muted-foreground text-xs">—</span>;
        return <GapCell minutes={gaps.afterLastStop} missingPunchDates={gaps.missingPunchDates} />;
      },
    },
  ];
}
