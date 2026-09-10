"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { DataGridColumnHeader } from "@/components/DataGrid/DataGridColumnHeader";
import { Number } from "@/components/Number";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { EmployeeReliabilityRow, SuspiciousZeroDay } from "@/app/productivity/reliabilitySelect";
import { plannedTimeOffActions } from "@/app/plannedTimeOff/plannedTimeOffSlice";

// ---------------------------------------------------------------------------
// SuspiciousDayEntry — inline form for recording an unplanned absence
// ---------------------------------------------------------------------------

type SuspiciousDayEntryProps = {
  day: SuspiciousZeroDay;
  employeeId: string;
};

function SuspiciousDayEntry({ day, employeeId }: SuspiciousDayEntryProps) {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const canSave = note.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await dispatch(
      plannedTimeOffActions.upsert({
        params: {
          doc: {
            plannedTimeOffId: crypto.randomUUID(),
            employeeId,
            requestType: "unplannedAbsence",
            dateRange: { min: day.date, max: day.date },
            timeRange: null,
            note: note.trim(),
            createdAt: "",
            updatedAt: "",
          },
        },
        config: { force: true },
      }),
    );
    setSaved(true);
    setExpanded(false);
  };

  // Format date for display: "2026-09-03" → "Wed 9/3"
  const displayDate = (() => {
    const d = new Date(day.date + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
  })();

  if (saved) return null;

  return (
    <div className="border-b border-border last:border-0 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-medium">{displayDate}</span>
          <span className="text-muted-foreground ml-2">
            {day.assignedCount} assigned
            {day.callAheadsAffected > 0 && (
              <span className="text-destructive ml-1">· {day.callAheadsAffected} call-ahead{day.callAheadsAffected > 1 ? "s" : ""}</span>
            )}
          </span>
        </div>
        {!expanded && (
          <Button
            variant="secondary"
            intensity="soft"
            size="sm"
            className="text-xs h-6 px-2 shrink-0"
            onClick={() => setExpanded(true)}
          >
            Record Absence
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Note <span className="text-destructive">*</span>
            </label>
            <textarea
              autoFocus
              className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="e.g. Called in sick at 7am, no prior notice…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              intensity="solid"
              className="h-6 px-3 text-xs"
              disabled={!canSave}
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-3 text-xs"
              onClick={() => { setExpanded(false); setNote(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlaggedDaysCell — popover trigger + content for suspicious zero days
// ---------------------------------------------------------------------------

type FlaggedDaysCellProps = {
  employeeId: string;
  suspiciousZeroDays: SuspiciousZeroDay[];
  employeeName: string;
};

function FlaggedDaysCell({ employeeId, suspiciousZeroDays, employeeName }: FlaggedDaysCellProps) {
  if (suspiciousZeroDays.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{suspiciousZeroDays.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="mb-2">
          <p className="text-xs font-semibold">{employeeName} — Unrecorded Absences?</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            These days had assignments but no completions while others worked. Record an absence if confirmed.
          </p>
        </div>
        <div className="space-y-0">
          {suspiciousZeroDays.map((day) => (
            <SuspiciousDayEntry key={day.date} day={day} employeeId={employeeId} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Column definitions for EmployeeReliabilityRow
// ---------------------------------------------------------------------------

export const reliabilityColumns: ColumnDef<EmployeeReliabilityRow>[] = [
  {
    id: "name",
    size: 160,
    meta: { label: "Employee" },
    header: ({ column }) => <DataGridColumnHeader column={column} title="Employee" isSorted={column.getIsSorted()} />,
    accessorFn: (row) => row.employee?.name ?? row.employeeId,
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.employee?.name ?? row.original.employeeId}
      </span>
    ),
  },
  {
    id: "absences",
    size: 90,
    meta: { label: "Absences" },
    header: ({ column }) => <DataGridColumnHeader column={column} title="Absences" isSorted={column.getIsSorted()} />,
    accessorFn: (row) => row.reliability.unplannedAbsenceCount,
    cell: ({ row }) => {
      const count = row.original.reliability.unplannedAbsenceCount;
      return count > 0
        ? <Number className="text-destructive font-medium">{count}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "servicesHit",
    size: 100,
    meta: { label: "Services Hit" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Services Hit" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.servicesHitByAbsences,
    cell: ({ row }) => {
      const count = row.original.reliability.servicesHitByAbsences;
      return count > 0
        ? <Number>{count}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "flaggedDays",
    size: 110,
    meta: { label: "Flagged Days" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Flagged Days" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.suspiciousZeroDays.length,
    cell: ({ row }) => (
      <FlaggedDaysCell
        employeeId={row.original.employeeId}
        suspiciousZeroDays={row.original.reliability.suspiciousZeroDays}
        employeeName={row.original.employee?.name ?? row.original.employeeId}
      />
    ),
  },
  {
    id: "callAheadsAffected",
    size: 120,
    meta: { label: "Call-Aheads Hit" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Call-Aheads Hit" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.callAheadsAffected,
    cell: ({ row }) => {
      const count = row.original.reliability.callAheadsAffected;
      return count > 0
        ? <Number className="text-destructive font-medium">{count}</Number>
        : <span className="text-muted-foreground text-xs">—</span>;
    },
  },
  {
    id: "actualCompletion",
    size: 160,
    meta: { label: "Actual Completion" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Actual Completion" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.actualCompletionPct ?? 0,
    cell: ({ row }) => {
      const r = row.original.reliability;
      const pct = r.actualCompletionPct;
      if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
      const frac = r.actualCompletionFraction;
      return (
        <span className="text-xs">
          {Math.round(pct * 100)}%
          {frac && (
            <span className="text-muted-foreground ml-1">({frac.completed}/{frac.assigned})</span>
          )}
        </span>
      );
    },
  },
  {
    id: "hypotheticalCompletion",
    size: 180,
    meta: { label: "Without Absences" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Without Absences" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.hypotheticalCompletionPct ?? 0,
    cell: ({ row }) => {
      const r = row.original.reliability;
      const pct = r.hypotheticalCompletionPct;
      if (pct === null) return <span className="text-muted-foreground text-xs">—</span>;
      const frac = r.hypotheticalCompletionFraction;
      return (
        <span className="text-xs">
          {Math.round(pct * 100)}%
          {frac && (
            <span className="text-muted-foreground ml-1">({frac.completed}/{frac.assigned})</span>
          )}
        </span>
      );
    },
  },
  {
    id: "absenceImpact",
    size: 120,
    meta: { label: "Absence Impact" },
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Absence Impact" isSorted={column.getIsSorted()} />
    ),
    accessorFn: (row) => row.reliability.absenceImpactPct ?? 0,
    cell: ({ row }) => {
      const impact = row.original.reliability.absenceImpactPct;
      if (impact === null || impact === 0)
        return <span className="text-muted-foreground text-xs">—</span>;
      return (
        <span className="text-xs text-destructive font-medium">
          -{Math.round(impact * 100)}%
        </span>
      );
    },
  },
];
