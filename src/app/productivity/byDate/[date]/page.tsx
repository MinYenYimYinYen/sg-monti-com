"use client";

import { use } from "react";
import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { Button } from "@/style/components/button";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { productivitySelect, ProductivityTotals, RouteGaps } from "@/app/productivity/productivitySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GapCell } from "@/app/productivity/_components/GapCell";

type Params = { date: string };

// ---------------------------------------------------------------------------
// Row type — one row per employee for this date
// ---------------------------------------------------------------------------

type EmployeeRow = {
  employeeId: string;
  name: string;
  totals: ProductivityTotals;
  routeGaps: RouteGaps | null;
};

// ---------------------------------------------------------------------------
// Columns — built with date so the link can include it
// ---------------------------------------------------------------------------

function buildColumns(date: string): ColumnDef<EmployeeRow>[] {
  return [
    {
      accessorKey: "name",
      size: 160,
      meta: { isFluid: true },
      header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
      cell: ({ row }) => (
        <Link
          href={`/productivity/byEmployee/${row.original.employeeId}/${date}`}
          className="text-primary hover:underline font-medium"
        >
          {row.original.name}
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
      id: "pctOfDay",
      size: 90,
      header: ({ column }) => <DataGridColumnHeader column={column} title="% of Day" />,
      cell: ({ row, table }) => {
        const allRows = table.getCoreRowModel().rows;
        const dayTotal = allRows.reduce((sum, r) => sum + r.original.totals.revenue, 0);
        if (dayTotal === 0) return <span className="text-muted-foreground text-xs">—</span>;
        const pct = (row.original.totals.revenue / dayTotal) * 100;
        return <span className="text-xs">{pct.toFixed(1)}%</span>;
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

export default function ByDateDetailPage({ params }: { params: Promise<Params> }) {
  const { date } = use(params);

  const byDateByEmployee = useSelector(productivitySelect.byDateByEmployee);
  const routeGapsByEmployeeByDate = useSelector(productivitySelect.routeGapsByEmployeeByDate);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const byEmployee = byDateByEmployee.get(date);

  const rows: EmployeeRow[] = byEmployee
    ? Array.from(byEmployee.entries()).map(([employeeId, totals]) => ({
        employeeId,
        name: employeeMap.get(employeeId)?.name ?? employeeId,
        totals,
        routeGaps: routeGapsByEmployeeByDate.get(employeeId)?.get(date) ?? null,
      }))
    : [];

  const sorted = [...rows].sort((a, b) => b.totals.revenue - a.totals.revenue);

  const prettyDateStr = prettyDate(date, "EEEE, MMMM d, yyyy", { fallback: date });
  const columns = buildColumns(date);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header with back button and date */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card/50">
        <Button variant="outline" intensity="ghost" size="icon" asChild>
          <Link href="/productivity/byDate" aria-label="Back to dates">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <span className="text-sm font-semibold text-foreground">{prettyDateStr}</span>
      </div>

      {/* Employee breakdown table */}
      <div className="flex-1 overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed services found for this date.</p>
        ) : (
          <DataGrid
            data={sorted}
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
