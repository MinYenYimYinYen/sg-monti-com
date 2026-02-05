"use client";

import { Table, VisibilityState } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { Button } from "@/style/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";

interface DataGridViewOptionsProps<TData> {
  table: Table<TData>;
  columnVisibility: VisibilityState;
}

export function DataGridViewOptions<TData>({
  table,
  columnVisibility,
}: DataGridViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide(),
          )
          .map((column) => {
            const isVisible =
              columnVisibility[column.id] !== undefined
                ? columnVisibility[column.id]
                : true;
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={isVisible}
                onCheckedChange={(value) => column.toggleVisibility(value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
