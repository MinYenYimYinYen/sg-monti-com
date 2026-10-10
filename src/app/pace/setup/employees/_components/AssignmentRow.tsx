"use client";

import { useState } from "react";
import { GripVertical, Info } from "lucide-react";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { formatGoal } from "@/app/pace/setup/groups/_components/GroupGoalPanel";

type AssignmentRowProps = {
  groupAssignment: GroupAssignment;
  index: number;
  totalCount: number;
  group: AssignmentGroup | undefined;
  isSelected: boolean;
  onToggleSelection: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: () => void;
  onGoalChange: (groupId: string, goal: number | null) => void;
};

export function AssignmentRow({
  groupAssignment,
  index,
  group,
  isSelected,
  onToggleSelection,
  onDragStart,
  onDragOver,
  onDrop,
  onGoalChange,
}: AssignmentRowProps) {
  const { groupId, dailyRevenueGoal } = groupAssignment;
  const label = group?.label ?? groupId;

  const [inputValue, setInputValue] = useState(formatGoal(dailyRevenueGoal));

  function handleBlur() {
    const trimmed = inputValue.trim();
    if (trimmed === "") {
      onGoalChange(groupId, null);
      return;
    }
    const n = parseFloat(trimmed);
    if (!isNaN(n) && n >= 0) {
      onGoalChange(groupId, n);
      setInputValue(String(Math.round(n)));
    } else {
      // Reset to last committed value
      setInputValue(formatGoal(dailyRevenueGoal));
    }
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/50 hover:bg-accent/5 cursor-grab active:cursor-grabbing"
    >
      {/* Drag handle */}
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />

      {/* Priority number */}
      <span className="text-[10px] text-muted-foreground w-4 text-left shrink-0">
        {index + 1}
      </span>

      {/* Group label */}
      <span className="font-mono text-xs font-semibold text-primary truncate min-w-0 flex-1">
        {label}
        {/* ServCode info popover */}
        {group && group.servCodeIds.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0 cursor-default"
                title="ServCodes"
              >
                <Info className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex flex-wrap gap-1">
                {group.servCodeIds.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </span>

      {/* Goal input */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          placeholder="goal"
          className="w-14 h-5 text-[10px] px-1 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <span className="text-[10px] text-muted-foreground">/day</span>
      </div>

      {/* Selection checkbox — rightmost */}
      <div
        className="shrink-0 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="accent-primary cursor-default"
          title="Select for copy / remove"
        />
      </div>
    </div>
  );
}
