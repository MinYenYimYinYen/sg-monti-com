"use client";

import { useState } from "react";
import { MatrixInfoButton } from "@/app/permission/_components/MatrixInfoButton";
import {
  cellKey,
  cellState,
  matchesRowFilter,
  resourceRowKey,
  type Matrix,
  type MatrixCell,
  type UsageFilter,
} from "@/permission/logic/capabilityMatrix";
import type { Capability } from "@/permission/PermissionTypes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/style/components/accordion";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Input } from "@/style/components/input";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";

/** `rowKey` is the group's key for a group cell, and `resourceRowKey` for a resource cell. */
export type ToggleCellParams = { rowKey: string; cell: MatrixCell; turnOn: boolean };

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

// The group header and the resource rows share these widths, so the verb checkboxes line up
// down the whole list. The info slot is always reserved, so a row without a description still aligns.
const VERB_COLUMN_CLASS = "flex w-16 justify-center";
const INFO_SLOT_CLASS = "flex w-8 justify-center";

/**
 * One accordion item per capability group, one open at a time. The group's header holds a
 * checkbox per verb that sets every resource of the group having that verb, and it shows a minus
 * when only some do. Opening the group lists its resources with the same checkboxes, so one
 * resource can differ from the rest. The filter only chooses which groups are drawn: it never
 * changes what is held.
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
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center border-b border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="flex-1">Group</span>
            <span className={INFO_SLOT_CLASS} />
            {matrix.columns.map((verb) => (
              <span key={verb} className={VERB_COLUMN_CLASS}>
                {verb}
              </span>
            ))}
          </div>

          <Accordion type="single" collapsible>
            {visibleRows.map((row) => (
              <AccordionItem key={row.key} value={row.key} className="last:border-b-0">
                <AccordionTrigger
                  className="px-3 py-2 hover:no-underline"
                  trailing={
                    <div className="flex items-center pr-3">
                      <span className={INFO_SLOT_CLASS}>
                        {row.description && <MatrixInfoButton name={row.name} description={row.description} />}
                      </span>
                      <VerbCheckboxes
                        columns={matrix.columns}
                        cells={row.cells}
                        rowKey={row.key}
                        label={row.name}
                        held={held}
                        disabled={disabled}
                        disabledCells={disabledCells}
                        cellNotes={cellNotes}
                        onToggleCellAction={onToggleCellAction}
                      />
                    </div>
                  }
                >
                  <span className="text-sm font-medium text-foreground">{row.name}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <ul className="divide-y divide-border border-t border-border bg-accent/10">
                    {row.resources.map((resource) => {
                      const resourceKey = resourceRowKey({ groupKey: row.key, resourceKey: resource.key });
                      return (
                        <li key={resource.key} className="flex items-center py-2 pl-6 pr-3">
                          <span className="flex flex-1 items-center gap-2 text-sm text-foreground">
                            {resource.name}
                            {resource.source && <Badge variant="outline">{resource.source}</Badge>}
                          </span>
                          <span className={INFO_SLOT_CLASS}>
                            {resource.description && (
                              <MatrixInfoButton name={resource.name} description={resource.description} />
                            )}
                          </span>
                          <VerbCheckboxes
                            columns={matrix.columns}
                            cells={resource.cells}
                            rowKey={resourceKey}
                            label={`${row.name}: ${resource.name}`}
                            held={held}
                            disabled={disabled}
                            disabledCells={disabledCells}
                            cellNotes={cellNotes}
                            onToggleCellAction={onToggleCellAction}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}

type VerbCheckboxesProps = {
  columns: string[];
  cells: (MatrixCell | null)[];
  rowKey: string;
  /** Names the row for assistive tech, since the verb is only written in the header row. */
  label: string;
  held: ReadonlySet<Capability>;
  disabled: boolean;
  disabledCells?: ReadonlySet<string>;
  cellNotes?: Readonly<Record<string, string>>;
  onToggleCellAction: (params: ToggleCellParams) => void;
};

function VerbCheckboxes({
  columns,
  cells,
  rowKey,
  label,
  held,
  disabled,
  disabledCells,
  cellNotes,
  onToggleCellAction,
}: VerbCheckboxesProps) {
  return (
    <>
      {cells.map((cell, columnIndex) => (
        <span key={columns[columnIndex]} className={VERB_COLUMN_CLASS}>
          {cell && (
            <VerbCheckbox
              rowKey={rowKey}
              label={label}
              cell={cell}
              held={held}
              disabled={disabled || !!disabledCells?.has(cellKey({ rowKey, verb: cell.verb }))}
              note={cellNotes?.[cellKey({ rowKey, verb: cell.verb })]}
              onToggleCellAction={onToggleCellAction}
            />
          )}
        </span>
      ))}
    </>
  );
}

type VerbCheckboxProps = {
  rowKey: string;
  label: string;
  cell: MatrixCell;
  held: ReadonlySet<Capability>;
  disabled: boolean;
  note?: string;
  onToggleCellAction: (params: ToggleCellParams) => void;
};

function VerbCheckbox({ rowKey, label, cell, held, disabled, note, onToggleCellAction }: VerbCheckboxProps) {
  const state = cellState({ cell, held });

  return (
    <span title={note}>
      <Checkbox
        aria-label={`${label}: ${cell.verb}`}
        checked={state === "all" ? true : state === "some" ? "indeterminate" : false}
        disabled={disabled}
        // A partly held cell is completed first. Only a fully held cell turns off.
        onCheckedChange={() => onToggleCellAction({ rowKey, cell, turnOn: state !== "all" })}
      />
    </span>
  );
}
