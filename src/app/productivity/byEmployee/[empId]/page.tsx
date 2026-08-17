"use client";

import { use } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { Button } from "@/style/components/button";
import { minutesToHoursMinutes } from "@/lib/primatives/dates/minutesToHoursMinutes";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { buildEmployeeDateColumns } from "@/app/productivity/_columns/employeeDateColumns";

type Params = { empId: string };

export default function ByEmployeeDetailPage({ params }: { params: Promise<Params> }) {
  const { empId } = use(params);

  const allRows = useSelector(productivitySelect.employeeDateRowsByEmployee);
  const employeeRows = useSelector(productivitySelect.employeeRows);

  const rows = [...(allRows.get(empId) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const employeeRow = employeeRows.find((r) => r.employeeId === empId);
  const totalMinutes = employeeRow?.labor?.totalMinutes ?? 0;
  const columns = buildEmployeeDateColumns(empId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card/50">
        <Button variant="outline" intensity="ghost" size="icon" asChild>
          <Link href="/productivity/byEmployee" aria-label="Back to employees">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-foreground">
            {employeeRow?.employee?.name ?? empId}
          </span>
          {totalMinutes > 0 && (
            <span className="text-muted-foreground">
              Total hours:{" "}
              <span className="font-mono text-foreground">{minutesToHoursMinutes(totalMinutes)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed services found for this employee in the selected date range.
          </p>
        ) : (
          <DataGrid
            data={rows}
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
