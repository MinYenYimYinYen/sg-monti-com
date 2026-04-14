"use client";

import React from "react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { cn } from "@/style/utils";
import { ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import type { TableConfig, TableColumnDef } from "@/app/quickSend/templates/TemplateTypes";

interface TableBlockEditorProps {
  tableConfig: TableConfig;
  onChange: (tableConfig: TableConfig) => void;
  /**
   * Available column fields for the current data source.
   * Derived from `TABLE_DATA_SOURCES[tableConfig.dataSource].rowColumns` in `dataFeatureVariables.ts`.
   * Keys are field names on the row type; values are human-readable labels.
   */
  rowColumns: Record<string, string>;
}

/**
 * Builder-side editor for a `table` content block.
 * Configures the data source (read-only), header visibility, and column definitions.
 */
export function TableBlockEditor({ tableConfig, onChange, rowColumns }: TableBlockEditorProps) {
  const { showHeaders, columns } = tableConfig;

  // Default field: first key in rowColumns, or empty string if none defined
  const defaultField = Object.keys(rowColumns)[0] ?? "";

  const setShowHeaders = (value: boolean) => {
    onChange({ ...tableConfig, showHeaders: value });
  };

  const addColumn = () => {
    const newColumn: TableColumnDef = { field: defaultField };
    onChange({ ...tableConfig, columns: [...columns, newColumn] });
  };

  const removeColumn = (index: number) => {
    const updated = columns.filter((_, i) => i !== index);
    onChange({ ...tableConfig, columns: updated });
  };

  const updateColumnField = (index: number, field: string) => {
    const updated = columns.map((col, i) => (i === index ? { ...col, field } : col));
    onChange({ ...tableConfig, columns: updated });
  };

  const updateColumnHeader = (index: number, header: string) => {
    const updated = columns.map((col, i) =>
      i === index ? { ...col, header: header || undefined } : col,
    );
    onChange({ ...tableConfig, columns: updated });
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const updated = [...columns];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    onChange({ ...tableConfig, columns: updated });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      {/* Data source — read-only */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide">
          Data Source
        </span>
        <span className="text-sm text-foreground/70">Program Services</span>
      </div>

      {/* Show headers toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="show-headers"
          checked={showHeaders}
          onCheckedChange={(checked) => setShowHeaders(checked === true)}
        />
        <Label htmlFor="show-headers" className="text-sm cursor-pointer">
          Show header row
        </Label>
      </div>

      {/* Column list */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wide">
            Columns
          </span>
          <Button
            size="sm"
            variant="accent"
            intensity="soft"
            onClick={addColumn}
          >
            <Plus className="h-3 w-3" />
            Add Column
          </Button>
        </div>

        {columns.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No columns defined. Add a column to configure the table.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {columns.map((col, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2 py-1.5"
              >
                {/* Reorder buttons */}
                <div className="flex flex-col shrink-0">
                  <button
                    className={cn(
                      "text-foreground/30 hover:text-foreground",
                      index === 0 && "opacity-20 pointer-events-none",
                    )}
                    onClick={() => moveColumn(index, "up")}
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    className={cn(
                      "text-foreground/30 hover:text-foreground",
                      index === columns.length - 1 && "opacity-20 pointer-events-none",
                    )}
                    onClick={() => moveColumn(index, "down")}
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Field picker — options derived from rowColumns prop */}
                <select
                  className="h-7 rounded border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
                  value={col.field}
                  onChange={(e) => updateColumnField(index, e.target.value)}
                >
                  {Object.entries(rowColumns).map(([field, label]) => (
                    <option key={field} value={field}>
                      {label}
                    </option>
                  ))}
                </select>

                {/* Header label input — only shown when showHeaders is true */}
                {showHeaders && (
                  <Input
                    className="h-7 text-xs flex-1 min-w-0"
                    placeholder="Column header (optional)"
                    value={col.header ?? ""}
                    onChange={(e) => updateColumnHeader(index, e.target.value)}
                  />
                )}

                {/* Remove button */}
                <button
                  className="text-foreground/30 hover:text-destructive shrink-0"
                  onClick={() => removeColumn(index)}
                  title="Remove column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
