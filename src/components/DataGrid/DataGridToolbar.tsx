"use client";

import * as React from "react";
import { Table, VisibilityState } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { DataGridViewOptions } from "./DataGridViewOptions";

interface DataGridToolbarProps<TData> {
  table: Table<TData>;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  columnVisibility?: VisibilityState;
  globalFilter?: string;
  globalFilterPlaceholder?: string;
}

export function DataGridToolbar<TData>({
  table,
  enableFiltering = false,
  enableColumnVisibility = false,
  columnVisibility = {},
  globalFilter = "",
  globalFilterPlaceholder = "Search...",
}: DataGridToolbarProps<TData>) {
  const isFiltered = (table.getState().globalFilter as string)?.length > 0;

  const [filterValue, setFilterValue] = React.useState<string>(globalFilter);

  // Sync with prop changes
  React.useEffect(() => {
    setFilterValue(globalFilter);
  }, [globalFilter]);

  const handleFilterChange = (value: string) => {
    setFilterValue(value);
    table.setGlobalFilter(value);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {enableFiltering && (
          <>
            <Input
              placeholder={globalFilterPlaceholder}
              value={filterValue}
              onChange={(event) => handleFilterChange(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={() => {
                  table.setGlobalFilter("");
                  setFilterValue("");
                }}
                className="h-8 px-2 lg:px-3"
              >
                Reset
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
      {enableColumnVisibility && (
        <DataGridViewOptions
          table={table}
          columnVisibility={columnVisibility}
        />
      )}
    </div>
  );
}
