"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import * as Popover from "@radix-ui/react-popover";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSelect } from "@/app/pace/paceSelect";
import { paceActions } from "@/app/pace/paceSlice";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceAssignmentPlanActions } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPct(multiplier: number): string {
  return `${Math.round(multiplier * 100)}%`;
}

function formatDollars(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// GoalMultiplierSlider
// ---------------------------------------------------------------------------

type GoalMultiplierSliderProps = {
  /**
   * If provided, the slider is locked to this group (no popover selector shown).
   * If omitted, a multi-select popover lets the user pick groups from the pace
   * module's assignment groups. The selection is persisted to Redux.
   */
  assignmentGroupId?: string;
};

/**
 * A what-if slider that scales every employee's dailyRevenueGoal by a multiplier
 * before the pace engine runs. Moving the slider re-runs the engine and updates
 * the burndown chart in real time.
 *
 * Range: 0–2 (0% to 200% of baseline goals), step: 0.05 (5% ticks).
 * Default: 1.0 (100% — baseline goals, no change).
 * Disabled when no groups are selected.
 *
 * Apply: bakes the multiplier into the stored plans for the selected groups only,
 * then resets the slider to 1.0.
 * Apply & Save: same as Apply, then saves the active scenario to the database.
 */
export function GoalMultiplierSlider({ assignmentGroupId }: GoalMultiplierSliderProps) {
  const dispatch = useAppDispatch();
  const multiplier = useSelector(paceSelect.goalMultiplier);
  const reduxGroupIds = useSelector(paceSelect.goalMultiplierGroupIds);
  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);
  const assignmentGroupMap = useSelector(paceAssignmentGroupSelect.assignmentGroupMap);
  const activeScenario = useSelector(assignmentPlanSelect.activeScenario);
  const assignmentPlans = useSelector(assignmentPlanSelect.assignmentPlans);

  // Resolve the active group IDs: prop takes precedence over Redux selection
  const selectedGroupIds: string[] = assignmentGroupId ? [assignmentGroupId] : reduxGroupIds;
  const hasSelection = selectedGroupIds.length > 0;
  const isBaseline = multiplier === 1;

  // Compute per-group scaled team goal/day for the selected groups
  type GroupGoal = { groupId: string; label: string; scaledGoal: number | null };
  const selectedGroupGoals: GroupGoal[] = selectedGroupIds.flatMap((groupId) => {
    const group = assignmentGroupMap.get(groupId);
    if (!group) return [];
    let sum = 0;
    let hasAnyGoal = false;
    for (const goal of group.goalsByEmployee.values()) {
      if (goal !== null) {
        sum += goal;
        hasAnyGoal = true;
      }
    }
    return [{ groupId, label: group.label, scaledGoal: hasAnyGoal ? sum * multiplier : null }];
  });

  // Trigger label for the multi-select popover
  function triggerLabel(): string {
    if (reduxGroupIds.length === 0) return "Select groups…";
    if (reduxGroupIds.length === 1) {
      return assignmentGroupMap.get(reduxGroupIds[0]!)?.label ?? reduxGroupIds[0]!;
    }
    return `${reduxGroupIds.length} groups`;
  }

  function toggleGroup(groupId: string) {
    const next = reduxGroupIds.includes(groupId)
      ? reduxGroupIds.filter((id) => id !== groupId)
      : [...reduxGroupIds, groupId];
    dispatch(paceActions.setGoalMultiplierGroupIds(next));
  }

  function handleApply() {
    dispatch(paceAssignmentPlanActions.applyGoalMultiplier({ multiplier, groupIds: selectedGroupIds }));
    dispatch(paceActions.setGoalMultiplier(1));
  }

  function handleApplyAndSave() {
    if (!activeScenario) return;
    // Compute scaled plans locally (can't read post-dispatch state synchronously)
    const groupIdSet = new Set(selectedGroupIds);
    const scaledPlans = assignmentPlans.map((plan) => ({
      ...plan,
      groupAssignments: plan.groupAssignments.map((ga) => ({
        ...ga,
        dailyRevenueGoal:
          groupIdSet.has(ga.groupId) && ga.dailyRevenueGoal !== null
            ? Math.round(ga.dailyRevenueGoal * multiplier)
            : ga.dailyRevenueGoal,
      })),
    }));
    dispatch(paceAssignmentPlanActions.applyGoalMultiplier({ multiplier, groupIds: selectedGroupIds }));
    dispatch(paceActions.setGoalMultiplier(1));
    dispatch(
      paceAssignmentPlanActions.upsertScenario({
        params: {
          ...activeScenario,
          updatedAt: new Date().toISOString(),
          plans: scaledPlans,
        },
        config: { showLoading: false },
      }),
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground whitespace-nowrap">
          Goal multiplier
        </span>

        {/* Multi-select group popover — only shown when no prop is provided */}
        {!assignmentGroupId && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-0.5 bg-card">
                <span>{triggerLabel()}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="end"
                sideOffset={4}
                className="z-50 min-w-[200px] max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-md p-1"
              >
                {assignmentGroups.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No groups</div>
                ) : (
                  assignmentGroups.map((group) => {
                    const checked = reduxGroupIds.includes(group.groupId);
                    return (
                      <button
                        key={group.groupId}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-accent/10 transition-colors ${
                          checked ? "text-primary" : "text-foreground"
                        }`}
                        onClick={() => toggleGroup(group.groupId)}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            checked ? "bg-primary border-primary" : "border-border"
                          }`}
                        >
                          {checked && (
                            <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-card">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">{group.label}</span>
                      </button>
                    );
                  })
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>

      {/* Slider — disabled when no groups selected */}
      <RadixSlider.Root
        min={0}
        max={2}
        step={0.05}
        value={[multiplier]}
        disabled={!hasSelection}
        onValueChange={([value]) => {
          if (value !== undefined) dispatch(paceActions.setGoalMultiplier(value));
        }}
        className={`relative flex items-center select-none touch-none w-full h-5 ${!hasSelection ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        <RadixSlider.Track className="relative grow rounded-full h-1.5 bg-border">
          <RadixSlider.Range
            className={`absolute rounded-full h-full ${
              !hasSelection || isBaseline
                ? "bg-muted-foreground/40"
                : multiplier > 1
                  ? "bg-accent"
                  : "bg-destructive"
            }`}
          />
        </RadixSlider.Track>

        {/* Tick marks at every 5% (every step) */}
        <div className="absolute inset-x-0 flex justify-between pointer-events-none px-0">
          {Array.from({ length: 41 }, (_, i) => {
            const tickValue = i * 0.05;
            const isAtBaseline = Math.abs(tickValue - 1) < 0.001;
            return (
              <div
                key={i}
                className={`w-px h-2 rounded-full ${
                  isAtBaseline
                    ? "bg-primary/60"
                    : i % 4 === 0
                      ? "bg-border"
                      : "bg-border/40"
                }`}
              />
            );
          })}
        </div>

        <RadixSlider.Thumb
          className={`block w-4 h-4 rounded-full border-2 border-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            !hasSelection || isBaseline
              ? "bg-muted-foreground"
              : multiplier > 1
                ? "bg-accent"
                : "bg-destructive"
          }`}
        />
      </RadixSlider.Root>

      {/* Bottom row: readout + Apply buttons */}
      <div className="flex items-end justify-between gap-4">
        {/* Readout */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {/* Percentage label */}
          <span
            className={`text-sm font-semibold tabular-nums ${
              !hasSelection || isBaseline
                ? "text-muted-foreground"
                : multiplier > 1
                  ? "text-accent"
                  : "text-destructive"
            }`}
          >
            {formatPct(multiplier)}
            {hasSelection && !isBaseline && (
              <span className="text-xs font-normal ml-1 text-muted-foreground">
                {multiplier > 1 ? "▲ more aggressive" : "▼ less aggressive"}
              </span>
            )}
          </span>

          {/* Per-group scaled goals */}
          {hasSelection && selectedGroupGoals.length > 0 && (
            <div className="flex flex-col items-center gap-0.5 w-full">
              {selectedGroupGoals.map(({ groupId, label, scaledGoal }) => (
                <div key={groupId} className="flex items-center justify-center gap-3 text-xs text-muted-foreground tabular-nums">
                  <span className="font-mono text-foreground/70">{label}</span>
                  <span>
                    {scaledGoal !== null ? `${formatDollars(scaledGoal)}/day` : "no goals set"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!hasSelection && (
            <span className="text-xs text-muted-foreground">Select groups to enable</span>
          )}
        </div>

        {/* Apply / Apply & Save — only visible when not at baseline and groups selected */}
        {hasSelection && !isBaseline && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleApply}
              className="h-6 px-2 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-accent/10 transition-colors"
              title="Bake multiplier into stored goals for selected groups (does not save to database)"
            >
              Apply
            </button>
            {activeScenario && (
              <button
                onClick={handleApplyAndSave}
                className="h-6 px-2 rounded text-[10px] font-semibold bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                title="Bake multiplier into stored goals for selected groups and save to database"
              >
                Apply & Save
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
