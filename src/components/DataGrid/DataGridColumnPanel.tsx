"use client";

import { Table, VisibilityState } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { Button } from "@/style/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { cn } from "@/style/utils";

interface DataGridColumnPanelProps<TData> {
  table: Table<TData>;
  // Passed explicitly from DataGrid's React state so the compiler can track changes.
  // Reading table.getState().columnVisibility inside this component won't trigger re-renders
  // because `table` is a stable mutable object reference.
  columnVisibility: VisibilityState;
}

export function DataGridColumnPanel<TData>({
  table,
  columnVisibility,
}: DataGridColumnPanelProps<TData>) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  if (hideableColumns.length === 0) return null;

  // A column is visible unless explicitly set to false in state
  const allVisible = hideableColumns.every((col) => columnVisibility[col.id] !== false);

  return (
    // Centered on the top-right corner of the parent border
    <div className="absolute -top-3 -right-3 z-20">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-card shadow-sm border-border"
            aria-label="Manage columns"
          >
            <Settings2 className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Columns</span>
            {!allVisible && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => hideableColumns.forEach((col) => col.toggleVisibility(true))}
              >
                Show all
              </button>
            )}
          </div>
          <div className="space-y-1">
            {hideableColumns.map((column) => {
              const label =
                (column.columnDef.meta as { label?: string } | undefined)?.label ??
                column.id;
              const isVisible = columnVisibility[column.id] !== false;
              return (
                <label
                  key={column.id}
                  className={cn(
                    "flex items-center gap-2 px-1 py-0.5 rounded text-sm cursor-pointer hover:bg-accent/10 select-none",
                    !isVisible && "text-muted-foreground",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
