"use client";

import { useSelector } from "react-redux";
import { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { Button } from "@/style/components/button";
import { byZipCodeSelect } from "@/app/bizPlan/customerValue/byZipCode/byZipCodeSelect";
import { CustomerValueByZip } from "@/app/bizPlan/customerValue/customerValueTypes";
import type { CustomerValueTotals } from "@/app/bizPlan/customerValue/byZipCode/byZipCodeSelect";
import { exportJson } from "@/lib/misc/exportJson";

const columns: ColumnDef<CustomerValueByZip>[] = [
  {
    accessorKey: "zip",
    size: 90,
    meta: { label: "Zip" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Zip" isSorted={column.getIsSorted()} />
    ),
  },
  {
    accessorKey: "city",
    size: 140,
    meta: { label: "City" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="City" isSorted={column.getIsSorted()} />
    ),
  },
  {
    accessorKey: "activeCustomerCount",
    size: 110,
    meta: { label: "Customers" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Customers" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "customerValue",
    size: 130,
    meta: { label: "Value" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Value" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number isMoney decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "avgCustomerValue",
    size: 130,
    meta: { label: "Avg Value" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Value" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number isMoney decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "avgCustomerSize",
    size: 110,
    meta: { label: "Avg Size" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Size" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number decimals={0}>{getValue<number>()}</Number>
    ),
  },
  {
    accessorKey: "pestControlCustomerCount",
    size: 90,
    meta: { label: "Pest" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Pest" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "mlcCustomerCount",
    size: 80,
    meta: { label: "MLC" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="MLC" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => <Number>{getValue<number>()}</Number>,
  },
  {
    accessorKey: "avgExtraServicesPerCustomer",
    size: 110,
    meta: { label: "Avg Extra" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Avg Extra" isSorted={column.getIsSorted()} />
    ),
    cell: ({ getValue }) => (
      <Number decimals={1}>{getValue<number>()}</Number>
    ),
  },
];

function TotalsBar({ totals }: { totals: CustomerValueTotals }) {
  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-accent/10 border border-border rounded-md mb-4 text-sm shrink-0">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Customers</span>
        <span className="font-semibold">
          <Number>{totals.activeCustomerCount}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total Value</span>
        <span className="font-semibold">
          <Number isMoney decimals={0}>{totals.customerValue}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Value</span>
        <span className="font-semibold">
          <Number isMoney decimals={0}>{totals.avgCustomerValue}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Size</span>
        <span className="font-semibold">
          <Number decimals={0}>{totals.avgCustomerSize}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Pest Control</span>
        <span className="font-semibold">
          <Number>{totals.pestControlCustomerCount}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">MLC</span>
        <span className="font-semibold">
          <Number>{totals.mlcCustomerCount}</Number>
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Avg Extra Svcs</span>
        <span className="font-semibold">
          <Number decimals={1}>{totals.avgExtraServicesPerCustomer}</Number>
        </span>
      </div>
    </div>
  );
}

export default function ByZipCodePage() {
  const allZipRows = useSelector(byZipCodeSelect.allZipRows);
  const totals = useSelector(byZipCodeSelect.totals);

  const handleExport = () => {
    exportJson({ totals, rows: allZipRows }, "customerValue_byZipCode.json", {
      // Money fields: 0 decimals (displayed as whole dollars)
      customerValue: 0,
      avgCustomerValue: 0,
      // Size: 0 decimals
      avgCustomerSize: 0,
      // Counts: 0 decimals (integers)
      activeCustomerCount: 0,
      pestControlCustomerCount: 0,
      mlcCustomerCount: 0,
      // Avg extra services: 1 decimal
      avgExtraServicesPerCustomer: 1,
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
        data={allZipRows}
        columns={columns}
        enableSorting
        enablePagination={false}
        rowVariant="alternating"
      />
    </div>
  );
}
