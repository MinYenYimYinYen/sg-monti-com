"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useRouteNotes } from "@/app/routeNotes/useRouteNotes";
import { paceActions } from "@/app/pace/paceSlice";
import { routePlanSelect } from "@/app/pace/routePlanSelect";
import { RoutePlanDay } from "@/app/pace/routePlanTypes";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { RoutePlanEmployeeRow } from "@/app/pace/_components/RoutePlanEmployeeRow";
import { RouteNoteEditor } from "@/app/routeNotes/_components/RouteNoteEditor";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { cn } from "@/style/utils";
import { CloudRain, StickyNote, Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Date header formatter
// ---------------------------------------------------------------------------

function formatCardDate(dateStr: string): { weekday: string; monthDay: string } {
  const date = new Date(dateStr + "T00:00:00");
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    monthDay: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

function formatPrice(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// RoutePlanDateCard
// ---------------------------------------------------------------------------

type RoutePlanDateCardProps = {
  day: RoutePlanDay;
  isToday: boolean;
  /** Map<employeeId | "__day__", RouteNote[]> for this date. */
  notesByEmployee: Map<string, RouteNote[]>;
  /** All notes for this date that should appear in the crew lead summary. */
  crewLeadNotes: RouteNote[];
  /** Queued state for this date: { [employeeId]: boolean } */
  queuedForDate: Record<string, boolean>;
};

export function RoutePlanDateCard({
  day,
  isToday,
  notesByEmployee,
  crewLeadNotes,
  queuedForDate,
}: RoutePlanDateCardProps) {
  const dispatch = useAppDispatch();
  const { upsert: saveNote, deleteOne: deleteNote } = useRouteNotes({ minDate: day.date, maxDate: day.date });
  const { weekday, monthDay } = formatCardDate(day.date);
  const [isDayNoteOpen, setIsDayNoteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const dayTotals = useSelector(routePlanSelect.routePlanDayTotals);
  const totals = dayTotals.get(day.date);

  const dayNote = notesByEmployee.get("__day__")?.[0] ?? null;
  const hasDayNote = dayNote !== null;
  const hasCrewLeadNotes = crewLeadNotes.length > 0;

  function handleCopy() {
    const header = `${prettyDate(day.date, "EEE, MMM d")} Route Notes:`;
    // Day-level notes (employeeId === null) come first, then employee notes.
    const sorted = [...crewLeadNotes].sort((a, b) => {
      if (a.employeeId === null && b.employeeId !== null) return -1;
      if (a.employeeId !== null && b.employeeId === null) return 1;
      return 0;
    });
    const noteLines = sorted
      .map((n) => n.note)
      .join("\n\n");
    const text = `${header}\n${noteLines}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border bg-card min-w-[200px] max-w-[240px] shrink-0",
        isToday ? "border-primary/50 ring-1 ring-primary/30" : "border-border",
        day.isHoliday && "opacity-75",
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-lg border-b border-border",
          isToday ? "bg-primary/10" : "bg-muted/40",
        )}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-foreground">{weekday}</span>
            <span className="text-xs text-muted-foreground">{monthDay}</span>
          </div>
          {/* Day totals — always shown when there are planned employees */}
          {totals !== undefined && (
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              <span>
                Goal: <span className="font-medium text-foreground">{formatPrice(totals.totalGoalPrice)}</span>
              </span>
              <span>
                Queued: <span className={cn("font-medium", totals.totalQueuedPrice > 0 ? "text-primary" : "text-foreground")}>{formatPrice(totals.totalQueuedPrice)}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Day note trigger */}
          <button
            onClick={() => setIsDayNoteOpen(true)}
            className={cn(
              "p-0.5 rounded transition-colors",
              hasDayNote
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/40 hover:text-muted-foreground",
            )}
            title={hasDayNote ? "Edit day note" : "Add day note"}
          >
            <StickyNote className="w-3 h-3" />
          </button>

          {/* Copy crew lead summary */}
          {hasCrewLeadNotes && (
            <button
              onClick={handleCopy}
              className="p-0.5 rounded transition-colors text-muted-foreground hover:text-foreground"
              title="Copy crew lead summary"
            >
              {copied ? (
                <Check className="w-3 h-3 text-accent" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Phase badge */}
          <span
            className={cn(
              "text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
              day.phase === "past" && "bg-muted text-muted-foreground",
              day.phase === "present" && "bg-primary/20 text-primary",
              day.phase === "future" && "bg-accent/20 text-accent",
            )}
          >
            {day.phase}
          </span>
        </div>
      </div>

      {/* Holiday / weather banner */}
      {day.isHoliday && day.holidayDescription && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium border-b border-border",
            day.isWeatherDay
              ? "bg-secondary/10 text-secondary"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {day.isWeatherDay && <CloudRain className="w-3 h-3 shrink-0" />}
          <span className="truncate">{day.holidayDescription}</span>
        </div>
      )}

      {/* Employee rows */}
      <div className="flex flex-col px-3 py-2 gap-0.5 flex-1">
        {day.employees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No employees assigned</p>
        ) : (
          day.employees.map((employee) => {
            const employeeNotes = notesByEmployee.get(employee.employeeId);
            const employeeNote = employeeNotes?.[0] ?? null;
            return (
              <RoutePlanEmployeeRow
                key={employee.employeeId}
                employeeId={employee.employeeId}
                name={employee.name}
                statuses={employee.statuses}
                isHolidayDay={day.isHoliday}
                schedDate={day.date}
                phase={day.phase}
                note={employeeNote}
                isQueued={queuedForDate[employee.employeeId] ?? false}
              />
            );
          })
        )}
      </div>

      {/* Day note editor dialog */}
      <RouteNoteEditor
        note={dayNote}
        defaults={{ schedDate: day.date, employeeId: null }}
        isOpen={isDayNoteOpen}
        onCloseAction={() => setIsDayNoteOpen(false)}
        onSaveAction={(n) => { saveNote(n); }}
        onDeleteAction={(id) => { deleteNote(id); }}
      />
    </div>
  );
}
