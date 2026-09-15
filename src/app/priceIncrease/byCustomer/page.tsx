"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerIncreaseResultsSelect } from "@/app/priceIncrease/results/customerIncreaseResultsSelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { priceIncreaseConfigActions } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { applyIncreaseView } from "@/app/priceIncrease/results/_lib/applyIncreaseView";
import { CustomerIncreaseCard } from "@/app/priceIncrease/results/_components/CustomerIncreaseCard";
import { IncreaseViewControls } from "@/app/priceIncrease/results/_components/IncreaseViewControls";
import { AssignAllButton } from "@/app/priceIncrease/results/_components/AssignAllButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { Paginator } from "@/components/Paginator/Paginator";

const PAGE_SIZE = 25;

/**
 * By Customer view — the primary price increase results view.
 *
 * Renders all CustomerIncreaseResult entries with sort, group, and pagination.
 * The AssignAllButton in the sub-header handles en masse flag assignment.
 */
export default function PriceIncreaseByCustomerPage() {
  const dispatch = useAppDispatch();
  const results = useSelector(customerIncreaseResultsSelect.results);
  const viewConfig = useSelector(priceIncreaseConfigSelect.viewConfig);

  const view = applyIncreaseView(results, viewConfig);
  const displayResults = view.grouped ? view.activeResults : view.results;

  const { page, setPage, totalPages, totalItems, pageItems } = usePagination(displayResults, PAGE_SIZE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header: view controls + assign all */}
      <div className="shrink-0 flex items-start justify-between gap-3 px-3 py-2 border-b border-border bg-card">
        <IncreaseViewControls />
        <AssignAllButton />
      </div>

      {/* Group tabs — shown when grouping is active */}
      {view.grouped && (
        <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card overflow-x-auto">
          {Array.from(view.groups.keys()).map((label) => {
            const count = view.groups.get(label)?.length ?? 0;
            const isActive = label === view.activeGroup;
            return (
              <button
                key={label}
                onClick={() => dispatch(priceIncreaseConfigActions.setViewActiveGroup(label))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-foreground/60 hover:bg-accent/10"
                }`}
              >
                {label}
                <span
                  className={`text-[10px] px-1 rounded ${
                    isActive ? "bg-primary/30 text-primary" : "bg-accent/20 text-foreground/40"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-sm text-foreground/40">
          No results — configure settings on the Config tab to get started.
        </div>
      )}

      {/* Card list */}
      {results.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {pageItems.map((result) => (
            <CustomerIncreaseCard key={result.customer.custId} result={result} />
          ))}
        </div>
      )}

      {/* Paginator */}
      {totalPages > 1 && (
        <div className="shrink-0 flex justify-center border-t border-border bg-card px-3 py-1">
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
