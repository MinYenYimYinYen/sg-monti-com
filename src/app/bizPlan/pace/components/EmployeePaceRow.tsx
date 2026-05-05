"use client";

import { EmployeeShare } from "@/app/bizPlan/pace/PaceType";
import { EmployeeDetailPopover } from "@/app/bizPlan/pace/components/EmployeeDetailPopover";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { LandPlot } from "lucide-react";

type EmployeePaceRowProps = {
  share: EmployeeShare;
  programType: string | null;
  onRemoveAction: (employeeId: string) => void;
};

export function EmployeePaceRow({ share, programType, onRemoveAction }: EmployeePaceRowProps) {
  const { employee, expectedCSP, isEstimated, fractionConsumed } = share;
  const isOverloaded =
    fractionConsumed !== null &&
    (fractionConsumed.count > 1 ||
      fractionConsumed.size > 1 ||
      fractionConsumed.price > 1);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <EmployeeDetailPopover employeeId={employee.employeeId} programType={programType}>
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
        <div className="flex items-center gap-2.5 text-sm font-mono text-muted-foreground">
          {expectedCSP != null ? (
            <>
              <span className="flex items-center gap-0.5">
                <span className="text-xs font-bold">#</span>
                <Number decimals={0}>{expectedCSP.count}</Number>
              </span>
              <span className="flex items-center gap-0.5">
                <LandPlot className="w-3.5 h-3.5" />
                <Number decimals={0}>{expectedCSP.size}</Number>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="text-xs">$</span>
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
