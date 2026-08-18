"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";

interface DataGridToolbarProps<TData> {
  table: Table<TData>;
  globalFilterPlaceholder?: string;
}

export function DataGridToolbar<TData>({
  table,
  globalFilterPlaceholder = "Search...",
}: DataGridToolbarProps<TData>) {
  const filterValue = (table.getState().globalFilter as string) ?? "";
  const isFiltered = filterValue.length > 0;

  return (
    <div className="flex items-center space-x-2">
      <Input
        placeholder={globalFilterPlaceholder}
        value={filterValue}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="h-8 w-[150px] lg:w-[250px]"
      />
      {isFiltered && (
        <Button
          variant="outline"
          onClick={() => table.setGlobalFilter("")}
          className="h-8 px-2 lg:px-3"
        >
          Reset
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
