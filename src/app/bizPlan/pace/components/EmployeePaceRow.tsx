"use client";

import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";
import { EmployeeDetailPopover } from "@/app/bizPlan/pace/components/EmployeeDetailPopover";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";

type EmployeePaceRowProps = {
  share: EmployeeShare;
  onRemoveAction: (employeeId: string) => void;
};

export function EmployeePaceRow({ share, onRemoveAction }: EmployeePaceRowProps) {
  const { employee, expectedCSP, isEstimated, fractionConsumed } = share;
  const isOverloaded =
    fractionConsumed !== null &&
    (fractionConsumed.count > 1 ||
      fractionConsumed.size > 1 ||
      fractionConsumed.price > 1);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <EmployeeDetailPopover employeeId={employee.employeeId}>
        <button
          className={cn(
            "text-sm text-left truncate transition-colors hover:text-primary",
            isOverloaded ? "text-destructive" : "text-foreground",
          )}
        >
          {employee.name}
          {isOverloaded && (
            <span className="ml-1 text-[10px] font-medium">⚠</span>
          )}
          {isEstimated && (
            <span className="ml-1 text-[10px] text-muted-foreground">~</span>
          )}
        </button>
      </EmployeeDetailPopover>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex gap-3 text-xs font-mono text-muted-foreground">
          {expectedCSP != null ? (
            <>
              <span>
                <Number decimals={0}>{expectedCSP.count}</Number>
              </span>
              <span>
                <Number decimals={0}>{expectedCSP.size}</Number>
              </span>
              <span>
                <Number isMoney decimals={0}>{expectedCSP.price}</Number>
              </span>
            </>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
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
