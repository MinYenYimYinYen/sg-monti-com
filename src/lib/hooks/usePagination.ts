import { useState } from "react";

type UsePaginationResult<T> = {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  pageItems: T[];
};

/**
 * Generic pagination hook. Slices an array to the current page.
 *
 * The current page is clamped whenever `items` or `pageSize` changes,
 * so stale page indices never produce an empty view (e.g. after a filter).
 */
export function usePagination<T>(items: T[], pageSize: number): UsePaginationResult<T> {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  return {
    page: clampedPage,
    setPage,
    totalPages,
    totalItems: items.length,
    pageItems,
  };
}
