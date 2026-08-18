"use client";

import { Column, SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/style/utils";

interface DataGridColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
  // Passed explicitly so the React Compiler can track sort state as a dependency.
  isSorted: false | SortDirection;
}

export function DataGridColumnHeader<TData, TValue>({
  column,
  title,
  isSorted,
  className,
}: DataGridColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const handleClick = () => {
    if (isSorted === "desc") {
      column.clearSorting();
    } else {
      column.toggleSorting(isSorted === "asc");
    }
  };

  return (
    <button
      className={cn(
        "flex items-center gap-1 text-left font-medium text-muted-foreground hover:text-foreground transition-colors select-none cursor-pointer",
        isSorted && "text-foreground",
        className,
      )}
      onClick={handleClick}
    >
      <span>{title}</span>
      {isSorted === "desc" ? (
        <ArrowDown className="h-3.5 w-3.5 shrink-0" />
      ) : isSorted === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
      )}
    </button>
  );
}
