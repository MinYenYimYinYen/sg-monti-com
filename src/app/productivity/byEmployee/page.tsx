"use client";

import { useSelector } from "react-redux";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { employeeColumns } from "@/app/productivity/_columns/employeeColumns";

export default function ByEmployeePage() {
  const rows = useSelector(productivitySelect.employeeRows);
  const sorted = [...rows].sort((a, b) => b.totals.revenue - a.totals.revenue);

  return (
    <div className="flex-1 overflow-auto p-4">
      <DataGrid
        data={sorted}
        columns={employeeColumns}
        enableSorting
        enablePagination={false}
        enableColumnVisibility
        rowVariant="alternating"
      />
    </div>
  );
}
