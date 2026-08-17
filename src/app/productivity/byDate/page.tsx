"use client";

import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { productivitySelect, ProductivityTotals, RouteGaps } from "@/app/productivity/productivitySelect";
import { GapCell } from "@/app/productivity/_components/GapCell";

// ---------------------------------------------------------------------------
// Row type — one row per date
// ---------------------------------------------------------------------------

type DateRow = {
  date: string;
  totals: ProductivityTotals;
  routeGaps: RouteGaps | null;
};

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<DateRow>[] = [
  {
    accessorKey: "date",
    size: 130,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Date" />,
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
    id: "revenuePerStop",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Stop" />,
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ByDatePage() {
  const byDateByEmployee = useSelector(productivitySelect.byDateByEmployee);
  const routeGapsByDate = useSelector(productivitySelect.routeGapsByDate);

  const rows: DateRow[] = Array.from(byDateByEmployee.entries()).map(([date, byEmployee]) => {
    // Aggregate totals across all employees for this date
    const totals: ProductivityTotals = { wholeCount: 0, fractionalCount: 0, size: 0, revenue: 0 };
    for (const empTotals of byEmployee.values()) {
      totals.wholeCount += empTotals.wholeCount;
      totals.fractionalCount += empTotals.fractionalCount;
      totals.size += empTotals.size;
      totals.revenue += empTotals.revenue;
    }
    return {
      date,
      totals,
      routeGaps: routeGapsByDate.get(date) ?? null,
    };
  });

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex-1 overflow-auto p-4">
      <DataGrid
        data={sorted}
        columns={columns}
        enableSorting
        enablePagination={false}
        rowVariant="alternating"
      />
    </div>
  );
}
