"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { Popover, PopoverContent, PopoverTrigger } from "@/style/components/popover";
import { DeleteGroupDialog } from "@/app/pace/setup/groups/_components/DeleteGroupDialog";

type GroupNavItemProps = {
  group: AssignmentGroup;
  isSelected: boolean;
  onSelect: () => void;
  onDeletedAction?: () => void;
};

export function GroupNavItem({ group, isSelected, onSelect, onDeletedAction }: GroupNavItemProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div
        onClick={onSelect}
        className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer border-l-2 transition-colors group/item ${
          isSelected
            ? "bg-primary/10 border-primary"
            : "border-transparent hover:bg-accent/5"
        }`}
      >
        {/* Group label */}
        <span className="font-mono text-xs font-semibold text-primary truncate min-w-0 flex-1">
          {group.label}
        </span>

        {/* ServCode info popover */}
        {group.servCodeIds.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
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

        {/* Employee count */}
        {group.assignedEmployeeIds.length > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            {group.assignedEmployeeIds.length}
          </span>
        )}

        {/* Delete button — visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteOpen(true);
          }}
          className="p-0.5 rounded text-muted-foreground/0 group-hover/item:text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Delete ServCode Group"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {deleteOpen && (
        <DeleteGroupDialog
          group={group}
          open={deleteOpen}
          onCloseAction={() => setDeleteOpen(false)}
          onDeletedAction={onDeletedAction}
        />
      )}
    </>
  );
}
