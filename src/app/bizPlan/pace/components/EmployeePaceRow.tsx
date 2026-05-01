"use client";

import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";
import { Number } from "@/components/Number";

type EmployeePaceRowProps = {
  share: EmployeeShare;
  onRemoveAction: (employeeId: string) => void;
};

export function EmployeePaceRow({ share, onRemoveAction }: EmployeePaceRowProps) {
  const { employee, shareCSP } = share;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-sm text-foreground truncate">{employee.name}</span>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex gap-3 text-xs font-mono text-muted-foreground">
          <span>
            <Number decimals={0}>{shareCSP.count}</Number>
          </span>
          <span>
            <Number decimals={0}>{shareCSP.size}</Number>
          </span>
          <span>
            <Number isMoney decimals={0}>{shareCSP.price}</Number>
          </span>
        </div>
        <button
          onClick={() => onRemoveAction(employee.employeeId)}
          className="text-muted-foreground hover:text-destructive transition-colors text-sm leading-none"
          aria-label={`Remove ${employee.name}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
