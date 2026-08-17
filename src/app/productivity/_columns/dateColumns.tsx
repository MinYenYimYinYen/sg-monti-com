"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { GapCell } from "@/app/productivity/_components/GapCell";
import { DateProductivityRow } from "@/app/productivity/productivitySelect";

export const dateColumns: ColumnDef<DateProductivityRow>[] = [
  {
    id: "date",
    size: 130,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
    accessorFn: (row) => row.date,
    cell: ({ row }) => (
      <Link
        href={`/productivity/byDate/${row.original.date}`}
        className="flex items-center gap-1 text-primary hover:underline font-medium text-xs font-mono"
      >
        {prettyDate(row.original.date, "EEE M/d/yy", { fallback: row.original.date })}
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
    id: "revenuePerStop",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Stop" />,
    accessorFn: (row) => row.totals.wholeCount > 0 ? row.totals.revenue / row.totals.wholeCount : 0,
    cell: ({ row }) => {
      const { revenue, wholeCount } = row.original.totals;
      if (wholeCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
      return <Number isMoney decimals={0}>{revenue / wholeCount}</Number>;
    },
  },
  {
    id: "sizePerStop",
    size: 100,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Size/Stop" />,
    accessorFn: (row) => row.totals.wholeCount > 0 ? row.totals.size / row.totals.wholeCount : 0,
    cell: ({ row }) => {
      const { size, wholeCount } = row.original.totals;
      if (wholeCount === 0) return <span className="text-muted-foreground text-xs">—</span>;
      return <Number decimals={1}>{size / wholeCount}</Number>;
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
