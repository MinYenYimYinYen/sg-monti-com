"use client";

import { useState } from "react";
import { MatrixRowHeader } from "@/app/permission/_components/MatrixRowHeader";
import {
  cellKey,
  cellState,
  matchesRowFilter,
  type Matrix,
  type MatrixCell,
  type MatrixRow,
  type UsageFilter,
} from "@/permission/logic/capabilityMatrix";
import type { Capability } from "@/permission/PermissionTypes";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Table, TableBody, TableCell, TableRow } from "@/style/components/table";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";

export type ToggleCellParams = { row: MatrixRow; cell: MatrixCell; turnOn: boolean };

type CapabilityMatrixProps = {
  matrix: Matrix;
  /** What the editor shows as held: a bundle's draft, or a user's effective capabilities. */
  held: ReadonlySet<Capability>;
  /** Keys from `cellKey`. A listed cell cannot be clicked. */
  disabledCells?: ReadonlySet<string>;
  /** Keys from `cellKey`. Shown as the cell's tooltip, for example why it is locked. */
  cellNotes?: Readonly<Record<string, string>>;
  /** Turns every cell off, for example while a request is running or the user may not edit. */
  disabled?: boolean;
  /** A generic primitive, decoupled from any slice, so it keeps a callback. */
  onToggleCellAction: (params: ToggleCellParams) => void;
};

const USAGE_OPTIONS: { value: UsageFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unused", label: "Unused" },
  { value: "used", label: "Used" },
];

/**
 * One row per capability group, one checkbox per verb. A checkbox sets every member of the row
 * that has the verb. The filter only chooses which rows are drawn: it never changes what is held.
 */
export function CapabilityMatrix({
  matrix,
  held,
  disabledCells,
  cellNotes,
  disabled = false,
  onToggleCellAction,
}: CapabilityMatrixProps) {
  const [text, setText] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");

  const visibleRows = matrix.rows.filter((row) => matchesRowFilter({ row, text, usage, held }));

  function clearFilter() {
    setText("");
    setUsage("all");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Filter by name, description or feature"
          aria-label="Filter capabilities"
          autoComplete="off"
          className="max-w-sm"
        />
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={usage}
          // Radix reports "" when the pressed item is pressed again. One option is always on.
          onValueChange={(next) => next && setUsage(next as UsageFilter)}
          aria-label="Show"
        >
          {USAGE_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visibleRows.length === 0 ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          No groups match.
          <Button type="button" size="sm" variant="outline" onClick={clearFilter}>
            Clear filter
          </Button>
        </div>
      ) : (
        <Table>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.key} variant="alternating">
                <TableCell noTruncate className="w-72">
                  <MatrixRowHeader row={row} />
                </TableCell>
                {row.cells.map((cell, columnIndex) => (
                  <TableCell noTruncate key={matrix.columns[columnIndex]}>
                    {cell && (
                      <MatrixCellBox
                        row={row}
                        cell={cell}
                        held={held}
                        disabled={disabled || !!disabledCells?.has(cellKey({ rowKey: row.key, verb: cell.verb }))}
                        note={cellNotes?.[cellKey({ rowKey: row.key, verb: cell.verb })]}
                        onToggleCellAction={onToggleCellAction}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

type MatrixCellBoxProps = {
  row: MatrixRow;
  cell: MatrixCell;
  held: ReadonlySet<Capability>;
  disabled: boolean;
  note?: string;
  onToggleCellAction: (params: ToggleCellParams) => void;
};

function MatrixCellBox({ row, cell, held, disabled, note, onToggleCellAction }: MatrixCellBoxProps) {
  const state = cellState({ cell, held });
  const id = `matrix-${cellKey({ rowKey: row.key, verb: cell.verb })}`;

  return (
    <div className="flex flex-col items-center gap-1" title={note}>
      <Checkbox
        id={id}
        checked={state === "all" ? true : state === "some" ? "indeterminate" : false}
        disabled={disabled}
        // A partly held cell is completed first. Only a fully held cell turns off.
        onCheckedChange={() => onToggleCellAction({ row, cell, turnOn: state !== "all" })}
      />
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {cell.verb}
      </Label>
    </div>
  );
}
