"use client";

import { useSelector } from "react-redux";
import { serviceIncreaseResultsSelect } from "@/app/priceIncrease/results/serviceIncreaseResultsSelect";
import { CustomerIncreaseCard } from "@/app/priceIncrease/results/_components/CustomerIncreaseCard";
import { usePagination } from "@/lib/hooks/usePagination";
import { Paginator } from "@/components/Paginator/Paginator";

const PAGE_SIZE = 25;

export default function TempResultsPage() {
  const byCustomer = useSelector(serviceIncreaseResultsSelect.byCustomer);
  const dataIssues = useSelector(serviceIncreaseResultsSelect.dataIssues);

  const allEntries = Array.from(byCustomer.entries());
  const { page, setPage, totalPages, totalItems, pageItems } = usePagination(allEntries, PAGE_SIZE);

  return (
    <div className="h-full overflow-y-auto p-2 space-y-1.5">
      <div className="flex items-center gap-3 px-1">
        <h2 className="text-lg font-semibold text-foreground">
          Service Increase Results (temp)
        </h2>
        {dataIssues.length > 0 && (
          <span className="text-sm text-destructive">
            {dataIssues.length} data issue{dataIssues.length !== 1 ? "s" : ""}
          </span>
        )}
        <div className="ml-auto">
          <Paginator
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      {pageItems.map(([custId, serviceResults]) => (
        <CustomerIncreaseCard key={custId} serviceResults={serviceResults} />
      ))}

      {byCustomer.size === 0 && (
        <p className="text-sm text-foreground/50 px-1">
          No results — check that settings are configured and customers are loaded.
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex justify-end">
          <Paginator
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
