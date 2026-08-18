"use client";

import { useSelector } from "react-redux";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { dateColumns } from "@/app/productivity/_columns/dateColumns";

export default function ByDatePage() {
  const rows = useSelector(productivitySelect.dateRows);
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex-1 overflow-auto p-4">
      <DataGrid
        data={sorted}
        columns={dateColumns}
        enableSorting
        enablePagination={false}
        enableColumnVisibility
        rowVariant="alternating"
      />
    </div>
  );
}
