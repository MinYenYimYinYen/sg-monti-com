"use client";

import { use } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { Button } from "@/style/components/button";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { buildDateEmployeeColumns } from "@/app/productivity/_columns/dateEmployeeColumns";

type Params = { date: string };

export default function ByDateDetailPage({ params }: { params: Promise<Params> }) {
  const { date } = use(params);

  const allRows = useSelector(productivitySelect.dateEmployeeRowsByDate);
  const rows = [...(allRows.get(date) ?? [])].sort((a, b) => b.totals.revenue - a.totals.revenue);
  const columns = buildDateEmployeeColumns(date);

  const prettyDateStr = prettyDate(date, "EEEE, MMMM d, yyyy", { fallback: date });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-border bg-card/50">
        <Button variant="outline" intensity="ghost" size="icon" asChild>
          <Link href="/productivity/byDate" aria-label="Back to dates">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <span className="text-sm font-semibold text-foreground">{prettyDateStr}</span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed services found for this date.</p>
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
