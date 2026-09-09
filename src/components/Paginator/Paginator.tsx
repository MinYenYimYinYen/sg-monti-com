import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginatorProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

/**
 * Generic pagination control. Displays current page, total pages, item count,
 * and prev/next navigation buttons.
 *
 * Stateless — all state is owned by the caller (e.g. via usePagination).
 */
export function Paginator({ page, totalPages, totalItems, pageSize, onPageChange }: PaginatorProps) {
  const startItem = totalItems === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center gap-3 px-1 py-1 text-xs text-foreground/60 select-none">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="flex items-center justify-center w-6 h-6 rounded border border-border hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <span className="tabular-nums">
        Page <span className="font-medium text-foreground">{page + 1}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </span>

      <span className="text-foreground/40">
        ({startItem}–{endItem} of {totalItems})
      </span>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="flex items-center justify-center w-6 h-6 rounded border border-border hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
