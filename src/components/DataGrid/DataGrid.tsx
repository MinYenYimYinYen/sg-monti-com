"use client";

/* eslint-disable react-hooks/incompatible-library */

import * as React from "react";
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { cn } from "@/style/utils";
import { DataGridProps } from "./types";
import { DataGridPagination } from "./DataGridPagination";
import { DataGridToolbar } from "./DataGridToolbar";

export function DataGrid<TData>({
  data,
  columns,
  enableSorting = true,
  enableFiltering = false,
  enablePagination = true,
  enableColumnVisibility = false,
  enableRowExpansion = false,
  enableColumnResizing = true,
  columnResizeMode = "onChange",
  getRowCanExpand,
  renderSubComponent,
  rowVariant = "default",
  pageSize = 10,
  className,
  globalFilterColumns = [],
  globalFilterPlaceholder = "Search...",
}: DataGridProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState<string>("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [expanded, setExpanded] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnSizing,
      expanded,
      pagination,
    },
    enableSorting,
    enableFilters: enableFiltering,
    enableGlobalFilter: enableFiltering,
    enableColumnResizing,
    columnResizeMode,
    globalFilterFn: (row, columnId, filterValue) => {
      // If no columns specified, search all string columns
      const columnsToSearch = globalFilterColumns.length > 0
        ? globalFilterColumns
        : Object.keys(row.original as object);

      const searchValue = String(filterValue).toLowerCase();

      return columnsToSearch.some((key) => {
        const value = row.original[key as keyof TData];
        return String(value).toLowerCase().includes(searchValue);
      });
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getExpandedRowModel: enableRowExpansion ? getExpandedRowModel() : undefined,
    getRowCanExpand,
    manualPagination: false,
  });

  // Reset to first page when data changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [data.length]);

  const getRowVariantClass = (isExpanded: boolean) => {
    switch (rowVariant) {
      case "alternating":
        return "even:bg-green-50 odd:bg-white hover:bg-green-100";
      case "expandable":
        return cn("cursor-pointer hover:bg-muted/50", isExpanded && "bg-muted");
      default:
        return "hover:bg-muted/50";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {(enableFiltering || enableColumnVisibility) && (
        <DataGridToolbar
          table={table}
          enableFiltering={enableFiltering}
          enableColumnVisibility={enableColumnVisibility}
          columnVisibility={columnVisibility}
          globalFilter={globalFilter}
          globalFilterPlaceholder={globalFilterPlaceholder}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableRowExpansion && <TableHead className="w-[40px]" />}
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    enableColumnResizing={enableColumnResizing}
                    header={header}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    className={getRowVariantClass(row.getIsExpanded())}
                    onClick={
                      enableRowExpansion && row.getCanExpand()
                        ? () => row.toggleExpanded()
                        : undefined
                    }
                  >
                    {enableRowExpansion && (
                      <TableCell>
                        {row.getCanExpand() ? (
                          row.getIsExpanded() ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        ) : null}
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && renderSubComponent && (
                    <TableRow>
                      <TableCell
                        colSpan={
                          row.getVisibleCells().length +
                          (enableRowExpansion ? 1 : 0)
                        }
                      >
                        {renderSubComponent(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowExpansion ? 1 : 0)}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <DataGridPagination
          table={table}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={table.getPageCount()}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
        />
      )}
    </div>
  );
}
