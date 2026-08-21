"use client";

import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { Button } from "@/style/components/button";
import { byProgramSelect } from "@/app/bizPlan/customerValue/byProgram/byProgramSelect";
import type { CustomerValueByProgram, ProgramTotals } from "@/app/bizPlan/customerValue/byProgram/byProgramSelect";
import { exportJson } from "@/lib/misc/exportJson";

const columns: ColumnDef<CustomerValueByProgram>[] = [
  {
    accessorKey: "progCodeId",
    size: 100,
    meta: { label: "Program" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Program" isSorted={column.getIsSorted()} />
    ),
  },
  {
    accessorKey: "description",
    size: 200,
    meta: { label: "Description" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Description" isSorted={column.getIsSorted()} />
    ),
  },
  {
    accessorKey: "serviceCount",
    size: 100,
    meta: { label: "Services" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Services" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "avgServsPerProgram",
    size: 110,
    meta: { label: "Avg Servs" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Servs" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number decimals={1}>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "totalSize",
    size: 110,
    meta: { label: "Total Size" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Total Size" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number decimals={0}>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "avgSize",
    size: 100,
    meta: { label: "Avg Size" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Size" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number decimals={0}>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "totalRev",
    size: 130,
    meta: { label: "Total Rev" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Total Rev" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number isMoney decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "avgServiceRev",
    size: 130,
    meta: { label: "Avg Service Rev" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Service Rev" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number isMoney decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "avgAcquisitionPrice",
    size: 120,
    meta: { label: "Avg Acq Price" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Acq Price" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number isMoney decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "avgMaturityRatio",
    size: 100,
    meta: { label: "Maturity" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Maturity" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <span><Number decimals={0}>{getValue<number>() * 100}</Number>%</span>
    ),
  },
];

function TotalsBar({ totals }: { totals: ProgramTotals }) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-accent/10 border border-border rounded-md text-sm shrink-0">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Services</span>
        <span className="font-semibold">
          <Number>{totals.serviceCount}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Servs</span>
        <span className="font-semibold">
          <Number decimals={1}>{totals.avgServsPerProgram}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total Size</span>
        <span className="font-semibold">
          <Number decimals={0}>{totals.totalSize}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Size</span>
        <span className="font-semibold">
          <Number decimals={0}>{totals.avgSize}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total Rev</span>
        <span className="font-semibold">
          <Number isMoney decimals={0}>{totals.totalRev}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Service Rev</span>
        <span className="font-semibold">
          <Number isMoney decimals={0}>{totals.avgServiceRev}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Acq Price</span>
        <span className="font-semibold">
          <Number isMoney decimals={0}>{totals.avgAcquisitionPrice}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Maturity</span>
        <span className="font-semibold">
          <Number decimals={0}>{totals.avgMaturityRatio * 100}</Number>%
        </span>
      </div>
    </div>
  );
}

export default function ByProgramPage() {
  const allProgramRows = useSelector(byProgramSelect.allProgramRows);
  const totals = useSelector(byProgramSelect.totals);

  const handleExport = () => {
    exportJson({ totals, rows: allProgramRows }, "customerValue_byProgram.json", {
      // Counts: 0 decimals (integers)
      serviceCount: 0,
      programCount: 0,
      customerCount: 0,
      // Avg servs: 1 decimal
      avgServsPerProgram: 1,
      // Size: 0 decimals
      totalSize: 0,
      avgSize: 0,
      // Money: 0 decimals (displayed as whole dollars)
      totalRev: 0,
      avgServiceRev: 0,
    });
  };

  return (
    <div className="flex-1 overflow-auto p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <TotalsBar totals={totals} />
        <Button
          variant="outline"
          intensity="soft"
          size="sm"
          className="gap-1.5 shrink-0 ml-2"
          onClick={handleExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
      <DataGrid
        data={allProgramRows}
        columns={columns}
        enableSorting
        enablePagination={false}
        rowVariant="alternating"
      />
    </div>
  );
}
