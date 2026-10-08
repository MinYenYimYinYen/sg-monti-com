"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { seasonPlanPageSelect } from "@/app/pace/seasonPlan/seasonPlanPageSelect";
import { GroupSchedule } from "@/app/pace/seasonPlan/SeasonPlanTypes";
import { WeekRangeSlider } from "@/app/pace/seasonPlan/_components/WeekRangeSlider";
import { FeasibilityBadge } from "@/app/pace/seasonPlan/_components/FeasibilityBadge";
import {
  FormState,
  DEFAULT_CASCADE_THRESHOLD,
  CURRENT_YEAR,
} from "@/app/pace/seasonPlan/_components/seasonPlanHelpers";

export function SeasonPlanForm({
  initialForm,
  isEditing,
  onSaveAction,
  onCancelAction,
}: {
  initialForm: FormState;
  isEditing: boolean;
  onSaveAction: (form: FormState) => void;
  onCancelAction: () => void;
}) {
  const [form, setForm] = useState<FormState>(initialForm);
  const assignmentGroups = useSelector(seasonPlanPageSelect.assignmentGroups);

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
      }
      return {
        ...prev,
        groupSchedules: [...prev.groupSchedules, { groupId, plannedStart, plannedEnd }],
      };
    });
  }

  function handleSubmit() {
    const trimmedName = form.name.trim();
    if (!trimmedName) return;
    onSaveAction({
      ...form,
      name: trimmedName,
      groupSchedules: form.groupSchedules.filter((s) => s.plannedStart && s.plannedEnd),
    });
  }

  return (
    <div className="flex flex-col gap-4">
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
            onChange={(e) =>
              setForm((f) => ({ ...f, year: parseInt(e.target.value) || CURRENT_YEAR }))
            }
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Cascade Threshold
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.cascadeThreshold}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cascadeThreshold: parseFloat(e.target.value) || DEFAULT_CASCADE_THRESHOLD,
              }))
            }
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Snow Melt (slider start)
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
            Snow Deadline (slider end)
          </label>
          <input
            type="date"
            value={form.snowDeadline}
            onChange={(e) => setForm((f) => ({ ...f, snowDeadline: e.target.value }))}
            className="h-8 text-xs px-2 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Group Planned Dates
        </p>
        <div className="border border-border rounded overflow-hidden divide-y divide-border/50">
          {assignmentGroups.length === 0 && (
            <p className="px-4 py-3 text-[10px] text-muted-foreground italic">
              No assignment groups found. Create groups in the Assignments tab first.
            </p>
          )}
          {assignmentGroups.map((assignmentGroup) => {
            const schedule = getGroupSchedule(assignmentGroup.groupId);
            const currentStart = schedule?.plannedStart || sliderMin;
            const currentEnd = schedule?.plannedEnd || sliderMax;
            return (
              <div
                key={assignmentGroup.groupId}
                className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/5"
              >
                <div className="w-28 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-primary font-semibold">
                      {assignmentGroup.label}
                    </span>
                    <FeasibilityBadge groupId={assignmentGroup.groupId} />
                  </div>
                  <span className="text-[9px] text-muted-foreground block truncate">
                    {assignmentGroup.servCodeIds.join(", ")}
                  </span>
                </div>
                <div className="flex-1 min-w-0 px-2">
                  <WeekRangeSlider
                    sliderMin={sliderMin}
                    sliderMax={sliderMax}
                    start={currentStart}
                    end={currentEnd}
                    onChangeAction={(start, end) => setGroupSchedule(assignmentGroup.groupId, start, end)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={!form.name.trim()}
          className="h-8 px-4 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isEditing ? "Save Changes" : "Create Plan"}
        </button>
        <button
          onClick={onCancelAction}
          className="h-8 px-3 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
