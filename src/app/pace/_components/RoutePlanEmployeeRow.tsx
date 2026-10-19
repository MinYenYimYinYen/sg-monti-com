"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useRouteNotes } from "@/app/routeNotes/useRouteNotes";
import { paceActions } from "@/app/pace/paceSlice";
import { paceSelect } from "@/app/pace/paceSelect";
import { EmployeeDayStatus, EmployeeDayStatuses, hasSchedulingConflict } from "@/app/pace/routePlanTypes";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { RouteNoteEditor } from "@/app/routeNotes/_components/RouteNoteEditor";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { CrawlerDayPhase } from "@/app/pace/lib/crawlerDay/CrawlerDay";
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
      // Scheduled = already in CRM. No popover — the price is already committed.
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
  phase: CrawlerDayPhase;
  /** Existing note for this employee+date, if any. */
  note: RouteNote | null;
  /** Whether this employee has been toggled as "queued" by the manager. */
  isQueued: boolean;
};

export function RoutePlanEmployeeRow({
  employeeId,
  name,
  statuses,
  isHolidayDay,
  schedDate,
  phase,
  note,
  isQueued,
}: RoutePlanEmployeeRowProps) {
  const dispatch = useAppDispatch();
  const { upsert: saveNote, deleteOne: deleteNote } = useRouteNotes({ minDate: schedDate, maxDate: schedDate });
  const isConflict = hasSchedulingConflict(statuses);
  const chips = statuses.map(getChipConfig).filter((c): c is ChipConfig => c !== null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPricePopoverOpen, setIsPricePopoverOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Read queued price from store directly — no prop drilling.
  const queuedPriceByDateAndEmployee = useSelector(paceSelect.queuedPriceByDateAndEmployee);
  const queuedPrice = queuedPriceByDateAndEmployee[schedDate]?.[employeeId] ?? 0;

  // A positive queued price implies the employee is queued.
  const effectiveIsQueued = isQueued || queuedPrice > 0;

  // Popover is eligible when:
  //   - Not a past day (past = read-only)
  //   - The employee does not have a "scheduled" status (already in CRM)
  const hasScheduledStatus = statuses.some((s) => s.kind === "scheduled");
  const isPopoverEligible = phase !== "past" && !hasScheduledStatus;

  // When there's exactly one visible chip and it has a detail, show it inline.
  // With multiple chips (conflict), details are omitted to keep the row compact.
  const singleDetail = chips.length === 1 ? chips[0].detail : undefined;

  const hasNote = note !== null;

  // Build the chip area. When queuedPrice > 0 and eligible, replace chips with "Queued: $X".
  const showQueuedChip = queuedPrice > 0 && isPopoverEligible;

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseFloat(raw);
    const price = isNaN(parsed) ? 0 : Math.max(0, parsed);
    dispatch(paceActions.setQueuedPrice({ date: schedDate, employeeId, price }));
  }

  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      setIsPricePopoverOpen(false);
    }
  }

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      // Sync local input value from store when opening.
      setInputValue(queuedPrice > 0 ? String(queuedPrice) : "");
    }
    setIsPricePopoverOpen(open);
  }

  const chipArea = (
    <div className="flex items-center gap-1 shrink-0">
      {showQueuedChip ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap bg-primary/20 text-primary">
          Queued: {formatPrice(queuedPrice)}
        </span>
      ) : (
        chips.map((chip, index) => (
          <span
            key={index}
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
              chip.className,
            )}
          >
            {chip.label}
          </span>
        ))
      )}
    </div>
  );

  const rowContent = (
    <>
      {/* Employee name — click to toggle queued state (no-op when price > 0) */}
      <span
        onClick={() => dispatch(paceActions.toggleQueued({ date: schedDate, employeeId }))}
        className={cn(
          "text-xs text-foreground truncate min-w-0 flex-1 cursor-pointer rounded px-0.5 -mx-0.5 transition-colors",
          effectiveIsQueued && "font-medium",
        )}
        title={effectiveIsQueued ? "Click to unmark" : "Click to mark as queued in CRM"}
      >
        {name}
      </span>
      {singleDetail && !showQueuedChip && (
        <span className="text-[9px] text-muted-foreground whitespace-nowrap shrink-0">{singleDetail}</span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {isPopoverEligible ? (
          <PopoverTrigger asChild>
            <button className="flex items-center" title="Set queued price">
              {chipArea}
            </button>
          </PopoverTrigger>
        ) : (
          chipArea
        )}
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
    </>
  );

  const rowDiv = (
    <div
      className={cn(
        "flex items-center gap-2 py-0.5 rounded",
        isHolidayDay && !isConflict && "opacity-40",
        isConflict && "bg-destructive/30 px-1 -mx-1",
        // Entire row gets the queued highlight when effectively queued.
        effectiveIsQueued && !isConflict && "bg-primary/20 px-1 -mx-1",
      )}
    >
      {rowContent}
    </div>
  );

  return (
    <>
      {isPopoverEligible ? (
        // Anchor the popover to the stable row div, not the chip trigger.
        // This prevents the popover from shifting when the chip text changes width.
        <Popover open={isPricePopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverAnchor asChild>{rowDiv}</PopoverAnchor>
          <PopoverContent className="w-52 p-3" align="start" side="bottom" sideOffset={4}>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Queue price for CRM</p>
              <input
                type="number"
                min={0}
                step="any"
                value={inputValue}
                onChange={handlePriceChange}
                onKeyDown={handlePriceKeyDown}
                placeholder="0"
                autoFocus
                className={cn(
                  "w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground",
                  "outline-none focus:ring-1 focus:ring-primary/50",
                  // Remove browser spin buttons
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                )}
              />
              <p className="text-[10px] text-muted-foreground">
                Enter the amount queued in the CRM for this employee on this date.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        rowDiv
      )}

      <RouteNoteEditor
        note={note}
        defaults={{ schedDate, employeeId, employeeName: name }}
        isOpen={isEditorOpen}
        onCloseAction={() => setIsEditorOpen(false)}
        onSaveAction={(n) => { saveNote(n); }}
        onDeleteAction={(id) => { deleteNote(id); }}
      />
    </>
  );
}
