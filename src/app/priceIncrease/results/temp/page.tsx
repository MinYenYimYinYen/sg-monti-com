"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerIncreaseResultsSelect } from "@/app/priceIncrease/results/customerIncreaseResultsSelect";
import { serviceIncreaseResultsSelect } from "@/app/priceIncrease/results/serviceIncreaseResultsSelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { CustomerIncreaseCard } from "@/app/priceIncrease/results/_components/CustomerIncreaseCard";
import { IncreaseViewControls } from "@/app/priceIncrease/results/_components/IncreaseViewControls";
import { usePagination } from "@/lib/hooks/usePagination";
import { Paginator } from "@/components/Paginator/Paginator";
import { applyIncreaseView } from "@/app/priceIncrease/results/_lib/applyIncreaseView";

const PAGE_SIZE = 25;

export default function TempResultsPage() {
  const dispatch = useAppDispatch();
  const allResults = useSelector(customerIncreaseResultsSelect.results);
  const dataIssues = useSelector(serviceIncreaseResultsSelect.dataIssues);
  const viewConfig = useSelector(priceIncreaseConfigSelect.viewConfig);

  const view = applyIncreaseView(allResults, viewConfig);
  const displayResults = view.grouped ? view.activeResults : view.results;

  const { page, setPage, totalPages, totalItems, pageItems } = usePagination(
    displayResults,
    PAGE_SIZE,
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed controls bar */}
      <div className="shrink-0 border-b border-border bg-card px-2 py-1.5 space-y-1">
        {/* Header row */}
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">
            Price Increase Results
          </h2>
          {dataIssues.length > 0 && (
            <span className="text-xs text-destructive">
              {dataIssues.length} data issue{dataIssues.length !== 1 ? "s" : ""}
            </span>
          )}
          <IncreaseViewControls />
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

        {/* Group tabs */}
        {view.grouped && (
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from(view.groups.entries()).map(([label, groupResults]) => (
              <button
                key={label}
                onClick={() => dispatch(priceIncreaseConfigActions.setViewActiveGroup(label))}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                  label === view.activeGroup
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/10 text-foreground/60 hover:bg-accent/20"
                }`}
              >
                {label}
                <span className="ml-1 opacity-60">({groupResults.length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {pageItems.map((result) => (
          <CustomerIncreaseCard key={result.customer.custId} result={result} />
        ))}

        {allResults.length === 0 && (
          <p className="text-sm text-foreground/50">
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
    </div>
  );
}
