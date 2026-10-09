"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { GroupAssignment } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";

type AddGroupDropdownProps = {
  existingGroupAssignments: GroupAssignment[];
  onAddGroup: (groupId: string) => void;
};

/**
 * Popover dropdown showing groups not yet assigned to the employee.
 * Clicking a group appends it to the assignment array with dailyRevenueGoal: null.
 */
export function AddGroupDropdown({ existingGroupAssignments, onAddGroup }: AddGroupDropdownProps) {
  const [open, setOpen] = useState(false);
  const assignmentGroups = useSelector(paceAssignmentGroupSelect.assignmentGroups);

  const existingGroupIds = new Set(existingGroupAssignments.map((ga) => ga.groupId));
  const availableGroups = assignmentGroups
    .filter((g) => !existingGroupIds.has(g.groupId))
    .sort((a, b) => a.label.localeCompare(b.label));

  function handleSelect(groupId: string) {
    onAddGroup(groupId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 h-7 px-2.5 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors">
          Add Group
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {availableGroups.length === 0 ? (
          <p className="px-2 py-1.5 text-[10px] text-muted-foreground">
            All groups already assigned.
          </p>
        ) : (
          <div className="space-y-0.5">
            {availableGroups.map((group) => (
              <button
                key={group.groupId}
                onClick={() => handleSelect(group.groupId)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-primary/10 text-left transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-primary truncate">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-0.5 ml-auto shrink-0">
                  {group.servCodeIds.slice(0, 3).map((id) => (
                    <span
                      key={id}
                      className="font-mono text-[8px] text-primary/70 bg-primary/10 rounded px-0.5"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
