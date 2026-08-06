"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, getDay, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Container } from "@/components/Containers";
import { Button } from "@/style/components/button";
import { usePlannedTimeOff } from "@/app/plannedTimeOff/usePlannedTimeOff";
import { useHoliday } from "@/app/holiday/useHoliday";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { PlannedTimeOffSheet } from "@/app/plannedTimeOff/calendar/PlannedTimeOffSheet";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Returns the Monday on or before the given date. */
function startOfWeekMonday(date: Date): Date {
  const day = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

/** Returns the Friday on or after the given date. */
function endOfWeekFriday(date: Date): Date {
  const day = getDay(date);
  const diff = day === 0 ? 5 : day <= 5 ? 5 - day : 6;
  return addDays(date, diff);
}

/** Build a list of weekday (Mon–Fri) date strings for the calendar grid. */
function buildCalendarDays(viewMonth: Date): string[] {
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeekMonday(monthStart);
  const gridEnd = endOfWeekFriday(monthEnd);

  const days: string[] = [];
  let current = gridStart;
  while (current <= gridEnd) {
    const day = getDay(current);
    if (day >= 1 && day <= 5) {
      days.push(toIso(current));
    }
    current = addDays(current, 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// CalendarCell
// ---------------------------------------------------------------------------

type CalendarCellProps = {
  date: string;
  isCurrentMonth: boolean;
  ptoEntries: PlannedTimeOff[];
  holidayLabel: string | null;
  employeeNameMap: Map<string, string>;
  onAdd: (date: string) => void;
  onEdit: (pto: PlannedTimeOff) => void;
};

function CalendarCell({
  date,
  isCurrentMonth,
  ptoEntries,
  holidayLabel,
  employeeNameMap,
  onAdd,
  onEdit,
}: CalendarCellProps) {
  const [, month, day] = date.split("-");
  const displayDay = parseInt(day, 10);
  const displayMonth = parseInt(month, 10);

  return (
    <div
      className={cn(
        "border border-border/40 min-h-[80px] p-1 flex flex-col gap-0.5",
        !isCurrentMonth && "bg-muted/10 opacity-60",
      )}
    >
      {/* Date header */}
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-mono text-muted-foreground", !isCurrentMonth && "opacity-50")}>
          {displayMonth}/{displayDay}
        </span>
        <button
          onClick={() => onAdd(date)}
          className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Add time off"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Holiday label */}
      {holidayLabel && (
        <div className="text-[9px] bg-secondary/20 text-secondary rounded px-1 py-0.5 truncate font-medium">
          🎉 {holidayLabel}
        </div>
      )}

      {/* PTO chips */}
      {ptoEntries.map((pto) => {
        const name = employeeNameMap.get(pto.employeeId) ?? pto.employeeId;
        return (
          <button
            key={pto.plannedTimeOffId}
            onClick={() => onEdit(pto)}
            className="text-[9px] bg-accent/20 text-accent rounded px-1 py-0.5 truncate text-left hover:bg-accent/30 transition-colors"
            title={`${name}${pto.note ? ` — ${pto.note}` : ""}`}
          >
            🏖 {name}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TimeOffCalendarPage
// ---------------------------------------------------------------------------

export default function TimeOffCalendarPage() {
  usePlannedTimeOff({ autoLoad: true });
  useHoliday({ autoLoad: true });
  useEmployee({ autoLoad: true });

  const allPto = useSelector(plannedTimeOffSelect.all);
  const holidays = useSelector(holidaySelect.all);
  const employees = useSelector(employeeSelect.employees);

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDefaultDate, setSheetDefaultDate] = useState<string>("");
  const [editingPto, setEditingPto] = useState<PlannedTimeOff | undefined>(undefined);

  const employeeNameMap = new Map(employees.map((e) => [e.employeeId, e.name]));

  const calendarDays = buildCalendarDays(viewMonth);
  const currentMonthStr = format(viewMonth, "yyyy-MM");

  // Build a map: date → PTO entries covering that date
  const ptoByDate = new Map<string, PlannedTimeOff[]>();
  for (const pto of allPto) {
    for (const day of calendarDays) {
      if (day >= pto.dateRange.min && day <= pto.dateRange.max) {
        const existing = ptoByDate.get(day) ?? [];
        existing.push(pto);
        ptoByDate.set(day, existing);
      }
    }
  }

  // Build a map: date → holiday description (first matching holiday)
  const holidayByDate = new Map<string, string>();
  for (const holiday of holidays) {
    for (const day of calendarDays) {
      if (day >= holiday.dateRange.min && day <= holiday.dateRange.max) {
        if (!holidayByDate.has(day)) {
          holidayByDate.set(day, holiday.description);
        }
      }
    }
  }

  const handleAdd = (date: string) => {
    setEditingPto(undefined);
    setSheetDefaultDate(date);
    setSheetOpen(true);
  };

  const handleEdit = (pto: PlannedTimeOff) => {
    setEditingPto(pto);
    setSheetDefaultDate(pto.dateRange.min);
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setEditingPto(undefined);
  };

  // Group days into rows of 5 (Mon–Fri)
  const weeks: string[][] = [];
  for (let i = 0; i < calendarDays.length; i += 5) {
    weeks.push(calendarDays.slice(i, i + 5));
  }

  return (
    <Container variant="scroll-shell" title="Time Off Calendar">
      {/* Month navigation */}
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-lg font-semibold text-foreground min-w-[160px] text-center">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewMonth(new Date())}
          className="ml-2"
        >
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        {/* Day headers */}
        <div className="grid grid-cols-5 mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-5">
            {week.map((date) => {
              const isCurrentMonth = date.startsWith(currentMonthStr);
              return (
                <CalendarCell
                  key={date}
                  date={date}
                  isCurrentMonth={isCurrentMonth}
                  ptoEntries={ptoByDate.get(date) ?? []}
                  holidayLabel={holidayByDate.get(date) ?? null}
                  employeeNameMap={employeeNameMap}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Add/Edit Sheet */}
      {sheetOpen && (
        <PlannedTimeOffSheet
          defaultDate={sheetDefaultDate}
          existingDoc={editingPto}
          employees={employees}
          onClose={handleClose}
        />
      )}
    </Container>
  );
}
