"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

const stepperButtonClass =
  "flex items-center justify-center w-8 h-8 rounded border border-border hover:bg-accent/10 text-foreground/60 hover:text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none";

type SeasonStepperRowProps = {
  label: string;
  hint: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecreaseAction: () => void;
  onIncreaseAction: () => void;
};

export function SeasonStepperRow({
  label,
  hint,
  value,
  canDecrease,
  canIncrease,
  onDecreaseAction,
  onIncreaseAction,
}: SeasonStepperRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-foreground/40">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDecreaseAction}
          disabled={!canDecrease}
          className={stepperButtonClass}
          aria-label={`Decrease ${label}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <span className="w-14 text-center text-xl font-bold tabular-nums text-foreground">
          {value}
        </span>
        <button
          onClick={onIncreaseAction}
          disabled={!canIncrease}
          className={stepperButtonClass}
          aria-label={`Increase ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
