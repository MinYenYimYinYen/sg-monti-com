"use client";

import { ProgCodePace } from "@/app/bizPlan/pace/PaceType";
import { CATEGORY_BADGE_STYLES } from "@/app/bizPlan/pace/paceStyles";
import { cn } from "@/style/utils";

type ProgCodePaceItemProps = {
  pace: ProgCodePace;
  isSelected: boolean;
  onSelectAction: (progCodeId: string, servCodeIds: string[]) => void;
};

export function ProgCodePaceItem({
  pace,
  isSelected,
  onSelectAction,
}: ProgCodePaceItemProps) {
  const { progCode, servCodePaces, unfinishedCSP, finishedCSP } = pace;
  const total = finishedCSP.count + unfinishedCSP.count;

  function handleClick() {
    const servCodeIds = servCodePaces.map((p) => p.servCode.servCodeId);
    onSelectAction(progCode.progCodeId, servCodeIds);
  }

  const percentComplete =
    total > 0 ? Math.round((finishedCSP.count / total) * 100) : 0;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left px-2.5 py-0.5 rounded-md transition-colors border",
        isSelected
          ? "bg-primary/15 border-primary/30"
          : "hover:bg-accent/10 border-transparent border-t-black/5",
      )}
    >
      {/* Line 1: progCodeId — description */}
      <div className="flex items-baseline min-w-0 text-sm">
        <span className="truncate">
          {progCode.progCodeId} - {progCode.description} {percentComplete}%
        </span>
      </div>

      {/* Line 2: servCode badges color-coded by category */}
      {servCodePaces.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {servCodePaces.map((sp) => (
            <span
              key={sp.servCode.servCodeId}
              className={cn(
                "inline-flex items-center rounded px-1 py-0 text-[10px] font-mono font-medium leading-4",
                CATEGORY_BADGE_STYLES[sp.category],
              )}
            >
              {sp.servCode.servCodeId}
            </span>
          ))}
        </div>
      )}


    </button>
  );
}
