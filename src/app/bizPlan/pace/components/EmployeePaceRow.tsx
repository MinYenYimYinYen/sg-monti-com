"use client";

import { EmployeeCascadeEntry } from "@/app/bizPlan/pace/PaceTypesRefactor";
import { EmployeeDetailPopover } from "@/app/bizPlan/pace/components/EmployeeDetailPopover";
import { Number } from "@/components/Number";
import { cn } from "@/style/utils";
import { LandPlot } from "lucide-react";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

type EmployeePaceRowProps = {
  share: EmployeeCascadeEntry & { employee: Employee };
  programType: string | null;
  isUnderCapacity: boolean;
  onRemoveAction: (employeeId: string) => void;
};

export function EmployeePaceRow({ share, programType, isUnderCapacity, onRemoveAction }: EmployeePaceRowProps) {
  const { employee, contributedCSP, isEstimated } = share;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <EmployeeDetailPopover employeeId={employee.employeeId}>
        <button
          className="text-sm text-left truncate transition-colors hover:text-primary text-foreground"
        >
          {employee.name}
          {isEstimated && (
            <span className="ml-1 text-[10px] text-muted-foreground">~</span>
          )}
        </button>
      </EmployeeDetailPopover>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-between gap-8 text-sm font-mono text-muted-foreground">
              {contributedCSP != null ? (
            <>
              <span className="flex items-center gap-0.5">
                <span className="text-xs font-bold">#</span>
                <Number decimals={0}>{contributedCSP.count}</Number>
                {share.dailyRate != null && (
                  <span className={cn(isUnderCapacity ? "text-destructive/70" : "text-accent/70")}>
                    /<Number decimals={0}>{share.dailyRate.count}</Number>
                  </span>
                )}
              </span>
              <span className="flex items-center gap-0.5">
                <LandPlot className="w-3.5 h-3.5" />
                <Number decimals={0}>{contributedCSP.size}</Number>
                {share.dailyRate != null && (
                  <span className={cn(isUnderCapacity ? "text-destructive/70" : "text-accent/70")}>
                    /<Number decimals={0}>{share.dailyRate.size}</Number>
                  </span>
                )}
              </span>
              <span className="flex items-center gap-0.5">
                <Number isMoney decimals={0}>{contributedCSP.price}</Number>
                {share.dailyRate != null && (
                  <span className={cn(isUnderCapacity ? "text-destructive/70" : "text-accent/70")}>
                    /<Number isMoney decimals={0}>{share.dailyRate.price}</Number>
                  </span>
                )}
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
