"use client";

import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { productivitySelect, ProductivityTotals, RouteGaps } from "@/app/productivity/productivitySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { GapCell } from "@/app/productivity/_components/GapCell";

// ---------------------------------------------------------------------------
// Row type — one row per employee
// ---------------------------------------------------------------------------

type EmployeeRow = {
  employeeId: string;
  name: string;
  totals: ProductivityTotals;
  totalMinutes: number;
  assigned: number;
  completed: number;
  completionPct: number;
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

const columns: ColumnDef<EmployeeRow>[] = [
  {
    accessorKey: "name",
    size: 160,
    meta: { isFluid: true },
    header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" />,
    cell: ({ row }) => (
      <Link
        href={`/productivity/byEmployee/${row.original.employeeId}`}
        className="flex items-center gap-1 text-primary hover:underline font-medium"
      >
        {row.original.name}
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    ),
  },
  {
    accessorKey: "totals.wholeCount",
    id: "stops",
    size: 80,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Stops" />,
    cell: ({ row }) => <Number>{row.original.totals.wholeCount}</Number>,
  },
  {
    accessorKey: "totals.revenue",
    id: "revenue",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Revenue" />,
    cell: ({ row }) => <Number isMoney decimals={0}>{row.original.totals.revenue}</Number>,
  },
  {
    accessorKey: "totals.size",
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
      row.original.totalMinutes > 0
        ? <span className="font-mono text-xs">{minutesToHoursMinutes(row.original.totalMinutes)}</span>
        : <span className="text-muted-foreground text-xs">—</span>
    ),
  },
  {
    id: "revenuePerHour",
    size: 100,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Rev/Hr" />,
    cell: ({ row }) => (
      row.original.totalMinutes > 0
        ? <Number isMoney decimals={0}>{perHour(row.original.totals.revenue, row.original.totalMinutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>
    ),
  },
  {
    id: "sizePerHour",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Size/Hr" />,
    cell: ({ row }) => (
      row.original.totalMinutes > 0
        ? <Number decimals={1}>{perHour(row.original.totals.size, row.original.totalMinutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>
    ),
  },
  {
    id: "stopsPerHour",
    size: 90,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Stops/Hr" />,
    cell: ({ row }) => (
      row.original.totalMinutes > 0
        ? <Number decimals={2}>{perHour(row.original.totals.wholeCount, row.original.totalMinutes)}</Number>
        : <span className="text-muted-foreground text-xs">—</span>
    ),
  },
  {
    id: "completion",
    size: 110,
    header: ({ column }) => <DataGridColumnHeader column={column} title="Completion" />,
    cell: ({ row }) => {
      const { assigned, completed, completionPct } = row.original;
      if (assigned === 0) return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <span className="text-xs">
          {completed}/{assigned} ({Math.round(completionPct * 100)}%)
        </span>
      );
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

export default function ByEmployeePage() {
  const byEmployee = useSelector(productivitySelect.byEmployee);
  const laborByEmployee = useSelector(productivitySelect.laborByEmployee);
  const completionByEmployee = useSelector(productivitySelect.assignmentCompletionByEmployee);
  const routeGapsByEmployee = useSelector(productivitySelect.routeGapsByEmployee);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const rows: EmployeeRow[] = Array.from(byEmployee.entries()).map(([employeeId, totals]) => {
    const employee = employeeMap.get(employeeId);
    const labor = laborByEmployee.get(employeeId);
    const completion = completionByEmployee.get(employeeId);
    return {
      employeeId,
      name: employee?.name ?? employeeId,
      totals,
      totalMinutes: labor?.totalMinutes ?? 0,
      assigned: completion?.assigned ?? 0,
      completed: completion?.completed ?? 0,
      completionPct: completion?.pct ?? 0,
      routeGaps: routeGapsByEmployee.get(employeeId) ?? null,
    };
  });

  const sorted = [...rows].sort((a, b) => b.totals.revenue - a.totals.revenue);

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
