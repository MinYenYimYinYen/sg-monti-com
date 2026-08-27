"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { seasonPlanSelect } from "@/app/bizPlan/seasonPlan/seasonPlanSelect";
import { useSeasonPlan } from "@/app/bizPlan/seasonPlan/useSeasonPlan";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { SeasonPlan, GroupSchedule } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";
import { Plus, Trash2, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Week / date helpers
// ---------------------------------------------------------------------------

/** Returns the Monday of the ISO week containing the given date. */
function mondayOf(iso: string): Date {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addWeeks(d: Date, weeks: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/** Build an array of Mondays from startMonday to endMonday (inclusive). */
function buildWeekMondays(startMonday: Date, endMonday: Date): string[] {
  const mondays: string[] = [];
  let current = new Date(startMonday);
  while (current <= endMonday) {
    mondays.push(toISO(current));
    current = addWeeks(current, 1);
  }
  return mondays;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

function fmtWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `W${weekNum}`;
}

function now(): string {
  return new Date().toISOString();
}

const DEFAULT_CASCADE_THRESHOLD = 0.95;
const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// WeekRangeSlider — dual-handle slider snapping to week Mondays
// ---------------------------------------------------------------------------

type WeekRangeSliderProps = {
  sliderMin: string;
  sliderMax: string;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  /** Optional: reference band to show on the track (e.g. RealGreen dateRange) */
  refMin?: string;
  refMax?: string;
};

function WeekRangeSlider({
  sliderMin,
  sliderMax,
  start,
  end,
  onChange,
  refMin,
  refMax,
}: WeekRangeSliderProps) {
  const startMonday = mondayOf(sliderMin);
  const endMonday = mondayOf(sliderMax);
  const mondays = buildWeekMondays(startMonday, endMonday);
  const totalWeeks = mondays.length - 1;

  function closestIdx(iso: string): number {
    if (!iso || totalWeeks <= 0) return 0;
    const target = toISO(mondayOf(iso));
    const idx = mondays.indexOf(target);
    if (idx >= 0) return idx;
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < mondays.length; i++) {
      const diff = Math.abs(new Date(mondays[i]).getTime() - new Date(target).getTime());
      if (diff < bestDiff) { bestDiff = diff; best = i; }
    }
    return best;
  }

  const startIdxResolved = closestIdx(start);
  const endIdxResolved = Math.max(startIdxResolved, closestIdx(end));

  if (totalWeeks <= 0) return null;

  const refMinIdx = refMin ? closestIdx(refMin) : null;
  const refMaxIdx = refMax ? closestIdx(refMax) : null;
  const refLeftPct = refMinIdx !== null ? (refMinIdx / totalWeeks) * 100 : null;
  const refWidthPct = refMinIdx !== null && refMaxIdx !== null
    ? ((refMaxIdx - refMinIdx) / totalWeeks) * 100
    : null;

  const startPct = (startIdxResolved / totalWeeks) * 100;
  const endPct = (endIdxResolved / totalWeeks) * 100;

  function handleTrackPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedIdx = Math.round(pct * totalWeeks);

    const distToStart = Math.abs(clickedIdx - startIdxResolved);
    const distToEnd = Math.abs(clickedIdx - endIdxResolved);
    const draggingStart = distToStart <= distToEnd;

    e.currentTarget.setPointerCapture(e.pointerId);

    function onMove(moveEvent: PointerEvent) {
      const movePct = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newIdx = Math.round(movePct * totalWeeks);
      if (draggingStart) {
        onChange(mondays[Math.min(newIdx, endIdxResolved)], mondays[endIdxResolved]);
      } else {
        onChange(mondays[startIdxResolved], mondays[Math.max(newIdx, startIdxResolved)]);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const startLabel = `${fmtWeek(mondays[startIdxResolved])} (${fmtDate(mondays[startIdxResolved])})`;
  const endLabel = `${fmtWeek(mondays[endIdxResolved])} (${fmtDate(mondays[endIdxResolved])})`;

  return (
    <div className="flex flex-col gap-0.5 w-full select-none">
      <div className="text-center text-[9px] font-mono text-primary font-semibold leading-tight">
        {startLabel} → {endLabel}
      </div>

      <div
        className="relative h-5 flex items-center cursor-pointer"
        onPointerDown={handleTrackPointerDown}
      >
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-border" />

        {refLeftPct !== null && refWidthPct !== null && (
          <div
            className="absolute h-1.5 rounded-full bg-accent/30"
            style={{ left: `${refLeftPct}%`, width: `${refWidthPct}%` }}
          />
        )}

        <div
          className="absolute h-1.5 rounded-full bg-primary/50"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-sm"
          style={{ left: `calc(${startPct}% - 7px)`, zIndex: 2 }}
        />
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-primary border-2 border-card shadow-sm"
          style={{ left: `calc(${endPct}% - 7px)`, zIndex: 2 }}
        />
      </div>

      <div className="relative h-7">
        {mondays.map((monday, idx) => {
          if (idx % 4 !== 0 && idx !== totalWeeks) return null;
          const pct = (idx / totalWeeks) * 100;
          return (
            <div
              key={monday}
              className="absolute flex flex-col items-center leading-none"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
            >
              <span className="text-[8px] text-muted-foreground/70 font-mono font-semibold">
                {fmtWeek(monday)}
              </span>
              <span className="text-[7px] text-muted-foreground/50 font-mono">
                {fmtDate(monday)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeasonPlanForm — create/edit a season plan
// ---------------------------------------------------------------------------

type FormState = {
  name: string;
  year: number;
  cascadeThreshold: number;
  snowMelt: string;
  snowDeadline: string;
  groupSchedules: GroupSchedule[];
};

function emptyForm(): FormState {
  return {
    name: "",
    year: CURRENT_YEAR,
    cascadeThreshold: DEFAULT_CASCADE_THRESHOLD,
    snowMelt: "",
    snowDeadline: "",
    groupSchedules: [],
  };
}

function planToForm(plan: SeasonPlan): FormState {
  return {
    name: plan.name,
    year: plan.year,
    cascadeThreshold: plan.cascadeThreshold,
    snowMelt: plan.snowMelt ?? "",
    snowDeadline: plan.snowDeadline ?? "",
    groupSchedules: [...plan.groupSchedules],
  };
}

type SeasonPlanFormProps = {
  initialForm: FormState;
  isEditing: boolean;
  onSave: (form: FormState) => void;
  onCancel: () => void;
};

function SeasonPlanForm({ initialForm, isEditing, onSave, onCancel }: SeasonPlanFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const groups = useSelector(assignmentGroupSelect.groups);

  const sliderMin = form.snowMelt || `${form.year}-01-01`;
  const sliderMax = form.snowDeadline || `${form.year}-11-30`;

  function getGroupSchedule(groupId: string): GroupSchedule | undefined {
    return form.groupSchedules.find((s) => s.groupId === groupId);
  }

  function setGroupSchedule(groupId: string, plannedStart: string, plannedEnd: string) {
    setForm((prev) => {
      const existing = prev.groupSchedules.find((s) => s.groupId === groupId);
      if (existing) {
        return {
          ...prev,
          groupSchedules: prev.groupSchedules.map((s) =>
            s.groupId === groupId ? { ...s, plannedStart, plannedEnd } : s,
          ),
        };
      } else {
        return {
          ...prev,
          groupSchedules: [...prev.groupSchedules, { groupId, plannedStart, plannedEnd }],
        };
      }
    });
  }

  function handleSubmit() {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    const validSchedules = form.groupSchedules.filter(
      (s) => s.plannedStart && s.plannedEnd,
    );
    onSave({ ...form, name: trimmedName, groupSchedules: validSchedules });
  }

  const scheduledCount = form.groupSchedules.filter((s) => s.plannedStart && s.plannedEnd).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Plan Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={isEditing}
            placeholder="e.g. 2026 Pre-Season"
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Year
          </label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) || CURRENT_YEAR }))}
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Cascade Threshold
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={form.cascadeThreshold}
              onChange={(e) => setForm((f) => ({ ...f, cascadeThreshold: parseFloat(e.target.value) || DEFAULT_CASCADE_THRESHOLD }))}
              className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24"
            />
            <span className="text-[10px] text-muted-foreground">
              ({Math.round(form.cascadeThreshold * 100)}% completion unlocks next)
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Snow Melt (optional — slider start)
          </label>
          <input
            type="date"
            value={form.snowMelt}
            onChange={(e) => setForm((f) => ({ ...f, snowMelt: e.target.value }))}
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Snow Deadline (optional — slider end)
          </label>
          <input
            type="date"
            value={form.snowDeadline}
            onChange={(e) => setForm((f) => ({ ...f, snowDeadline: e.target.value }))}
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Group schedules */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Group Planned Dates
          </p>
          <span className="text-[10px] text-muted-foreground">
            {scheduledCount}/{groups.length} scheduled
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3">
          Drag the handles to set planned start and end weeks per assignment group.
          One slider per group — the crawler applies the group&#39;s dates to all its member servCodes.
        </p>

        <div className="border border-border rounded overflow-hidden divide-y divide-border/50">
          {groups.length === 0 && (
            <p className="px-4 py-3 text-[10px] text-muted-foreground italic">
              No assignment groups found. Create groups in the Assignments tab first.
            </p>
          )}
          {groups.map((group) => {
            const schedule = getGroupSchedule(group.groupId);
            const currentStart = schedule?.plannedStart || sliderMin;
            const currentEnd = schedule?.plannedEnd || sliderMax;

            return (
              <div
                key={group.groupId}
                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/5"
              >
                {/* Group label */}
                <div className="w-28 shrink-0">
                  <span className="font-mono text-[10px] text-primary font-semibold block">
                    {group.label}
                  </span>
                  <span className="text-[9px] text-muted-foreground block truncate">
                    {group.servCodeIds.join(", ")}
                  </span>
                </div>

                {/* Slider */}
                <div className="flex-1 min-w-0 px-2">
                  <WeekRangeSlider
                    sliderMin={sliderMin}
                    sliderMax={sliderMax}
                    start={currentStart}
                    end={currentEnd}
                    onChange={(start, end) => setGroupSchedule(group.groupId, start, end)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={!form.name.trim()}
          className="h-8 px-4 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isEditing ? "Save Changes" : "Create Plan"}
        </button>
        <button
          onClick={onCancel}
          className="h-8 px-3 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeasonPlanPage
// ---------------------------------------------------------------------------

export default function SeasonPlanPage() {
  const seasonPlans = useSelector(seasonPlanSelect.seasonPlans);
  const { upsertSeasonPlan, deleteSeasonPlan, activateSeasonPlan } = useSeasonPlan({ autoLoad: true });

  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingPlan, setEditingPlan] = useState<SeasonPlan | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null);

  function handleCreate() {
    setEditingPlan(null);
    setMode("create");
  }

  function handleEdit(plan: SeasonPlan) {
    setEditingPlan(plan);
    setMode("edit");
  }

  function handleSave(form: FormState) {
    const timestamp = now();
    const plan: SeasonPlan = {
      name: form.name,
      year: form.year,
      cascadeThreshold: form.cascadeThreshold,
      snowMelt: form.snowMelt || null,
      snowDeadline: form.snowDeadline || null,
      groupSchedules: form.groupSchedules,
      isActive: editingPlan?.isActive ?? false,
      createdAt: editingPlan?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    upsertSeasonPlan(plan);
    setMode("list");
    setEditingPlan(null);
  }

  function handleDelete(name: string) {
    deleteSeasonPlan(name);
    setConfirmDeleteName(null);
  }

  function handleActivate(name: string) {
    activateSeasonPlan(name);
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center gap-2">
          <button
            onClick={() => { setMode("list"); setEditingPlan(null); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Season Plans
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">
            {mode === "create" ? "New Season Plan" : `Edit: ${editingPlan?.name}`}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SeasonPlanForm
            initialForm={editingPlan ? planToForm(editingPlan) : emptyForm()}
            isEditing={mode === "edit"}
            onSave={handleSave}
            onCancel={() => { setMode("list"); setEditingPlan(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Season Plans</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Committed planned dates per assignment group. One plan is active at a time.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 h-8 px-3 rounded text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Plan
        </button>
      </div>

      {/* Plan list */}
      <div className="flex-1 overflow-y-auto p-4">
        {seasonPlans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-sm text-muted-foreground">No season plans yet.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Create a season plan to set committed planned dates for each assignment group.
              The active plan drives the Gantt chart and cascade unlock logic.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 h-8 px-4 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Plan
            </button>
          </div>
        )}

        <div className="space-y-3">
          {seasonPlans.map((plan) => {
            const isActive = plan.isActive;
            const scheduledCount = plan.groupSchedules.length;

            return (
              <div
                key={plan.name}
                className={`border rounded-lg overflow-hidden ${isActive ? "border-primary/40 bg-primary/3" : "border-border bg-card"}`}
              >
                {/* Plan header */}
                <div className={`px-4 py-3 flex items-start justify-between gap-3 ${isActive ? "bg-primary/8" : "bg-accent/5"}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {plan.name}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[9px] text-primary bg-primary/15 rounded px-1.5 py-0.5 font-semibold shrink-0">
                          <Check className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span>Year: {plan.year}</span>
                      <span>Cascade: {Math.round(plan.cascadeThreshold * 100)}%</span>
                      {plan.snowMelt && <span>🌱 Melt: {fmtDate(plan.snowMelt)}</span>}
                      {plan.snowDeadline && <span>❄ Snow: {fmtDate(plan.snowDeadline)}</span>}
                      <span>{scheduledCount} group{scheduledCount !== 1 ? "s" : ""} scheduled</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                      Updated {new Date(plan.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleActivate(plan.name)}
                        className="h-7 px-2.5 rounded text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(plan)}
                      className="h-7 px-2.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                    >
                      Edit
                    </button>
                    {confirmDeleteName === plan.name ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(plan.name)}
                          className="h-7 px-2 rounded text-[10px] text-destructive font-semibold hover:bg-destructive/10 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteName(null)}
                          className="h-7 px-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteName(plan.name)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Schedule summary */}
                {scheduledCount > 0 && (
                  <div className="px-4 py-2 border-t border-border/50">
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {plan.groupSchedules.slice(0, 8).map((schedule) => (
                        <span key={schedule.groupId} className="text-[10px] font-mono text-muted-foreground">
                          {schedule.groupId}: {fmtDate(schedule.plannedStart)}–{fmtDate(schedule.plannedEnd)}
                        </span>
                      ))}
                      {scheduledCount > 8 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{scheduledCount - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


