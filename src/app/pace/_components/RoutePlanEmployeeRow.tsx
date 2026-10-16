"use client";

import { EmployeeDayStatus, EmployeeDayStatuses, hasSchedulingConflict } from "@/app/pace/routePlanTypes";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { RouteNoteEditor } from "@/app/routeNotes/_components/RouteNoteEditor";
import { cn } from "@/style/utils";
import { StickyNote } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Dollar formatter
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Status chip config
//
// Returns null for "holiday" — the card header already shows the holiday/weather
// banner, so a per-row chip would be redundant. The status is still tracked in
// the statuses array so hasSchedulingConflict() can detect holiday + scheduled.
// ---------------------------------------------------------------------------

type ChipConfig = {
  label: string;
  className: string;
  detail?: string;
};

function getChipConfig(status: EmployeeDayStatus): ChipConfig | null {
  switch (status.kind) {
    case "holiday":
      // Suppressed — the card header communicates this context.
      return null;
    case "unplanned-absence":
      return { label: "Absent", className: "bg-destructive/20 text-destructive" };
    case "pto":
      return { label: "PTO", className: "bg-secondary/20 text-secondary" };
    case "not-started":
      return { label: "Not started", className: "bg-muted text-muted-foreground" };
    case "done":
      return { label: "Done", className: "bg-muted text-muted-foreground" };
    case "completed":
      return {
        label: formatPrice(status.totalPrice),
        className: "bg-accent/20 text-accent",
        detail: status.servCodeIds.join(", "),
      };
    case "scheduled":
      return {
        label: formatPrice(status.totalPrice),
        className: "bg-primary/20 text-primary",
        detail: status.servCodeIds.join(", "),
      };
    case "projected":
      return {
        label: status.groupLabel,
        className: "bg-accent/10 text-accent",
        detail: status.goalDailyPrice !== null ? formatPrice(status.goalDailyPrice) : undefined,
      };
    case "available":
      return { label: "Available", className: "bg-muted/50 text-muted-foreground" };
  }
}

// ---------------------------------------------------------------------------
// RoutePlanEmployeeRow
// ---------------------------------------------------------------------------

type RoutePlanEmployeeRowProps = {
  employeeId: string;
  name: string;
  statuses: EmployeeDayStatuses;
  isHolidayDay: boolean;
  schedDate: string;
  /** Existing note for this employee+date, if any. */
  note: RouteNote | null;
  onSaveNote: (note: RouteNote) => void;
  onDeleteNote: (routeNoteId: string) => void;
  /** Whether this employee has been toggled as "queued" by the manager. */
  isQueued: boolean;
  onToggleQueued: () => void;
};

export function RoutePlanEmployeeRow({
  employeeId,
  name,
  statuses,
  isHolidayDay,
  schedDate,
  note,
  onSaveNote,
  onDeleteNote,
  isQueued,
  onToggleQueued,
}: RoutePlanEmployeeRowProps) {
  const isConflict = hasSchedulingConflict(statuses);
  const chips = statuses.map(getChipConfig).filter((c): c is ChipConfig => c !== null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // When there's exactly one visible chip and it has a detail, show it inline.
  // With multiple chips (conflict), details are omitted to keep the row compact.
  const singleDetail = chips.length === 1 ? chips[0].detail : undefined;

  const hasNote = note !== null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 py-0.5 rounded",
          isHolidayDay && !isConflict && "opacity-40",
          isConflict && "bg-destructive/30 px-1 -mx-1",
        )}
      >
        {/* Employee name — click to toggle queued state */}
        <span
          onClick={onToggleQueued}
          className={cn(
            "text-xs text-foreground truncate min-w-0 flex-1 cursor-pointer rounded px-0.5 -mx-0.5 transition-colors",
            isQueued && "bg-primary/20",
          )}
          title={isQueued ? "Click to unmark" : "Click to mark as queued in CRM"}
        >
          {name}
        </span>
        {singleDetail && (
          <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{singleDetail}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {chips.map((chip, index) => (
            <span
              key={index}
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
                chip.className,
              )}
            >
              {chip.label}
            </span>
          ))}
          {/* Note trigger */}
          <button
            onClick={() => setIsEditorOpen(true)}
            className={cn(
              "p-0.5 rounded transition-colors",
              hasNote
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
            title={hasNote ? "Edit note" : "Add note"}
          >
            <StickyNote className="w-3 h-3" />
          </button>
        </div>
      </div>

      <RouteNoteEditor
        note={note}
        defaults={{ schedDate, employeeId, employeeName: name }}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={onSaveNote}
        onDelete={onDeleteNote}
      />
    </>
  );
}
