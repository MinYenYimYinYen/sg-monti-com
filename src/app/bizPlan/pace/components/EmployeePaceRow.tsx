"use client";

import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";

type EmployeePaceRowProps = {
  share: EmployeeShare;
  onRemoveAction: (employeeId: string) => void;
};

export function EmployeePaceRow({ share, onRemoveAction }: EmployeePaceRowProps) {
  const { employee, shareCSP } = share;

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-foreground truncate">{employee.name}</span>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{shareCSP.count.toFixed(1)}</span>
          <span>{shareCSP.size.toFixed(1)}</span>
          <span>${shareCSP.price.toFixed(0)}</span>
        </div>
        <button
          onClick={() => onRemoveAction(employee.employeeId)}
          className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
          aria-label={`Remove ${employee.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
