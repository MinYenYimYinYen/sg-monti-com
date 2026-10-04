"use client";

import { useSelector } from "react-redux";
import { prioritiesSelect } from "@/app/pace/prioritiesSelect";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { UrgentChecklistContent } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/UrgentServCodeCard";
import { PriorityChecklistContent } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/PriorityServiceCard";
import { ScrollArea } from "@/style/components/scroll-area";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { UrgentGroupRow } from "@/app/pace/priorities/_components/UrgentGroupRow";

export function PrioritiesPage() {
  const urgentGroups = useSelector(prioritiesSelect.urgentGroups);
  const alwaysAsapServCodes = useSelector(prioritiesSelect.alwaysAsapServCodes);
  const priorityServices = useSelector(priorityServiceSelect.priorityServices);

  const asapUrgentServCodes = alwaysAsapServCodes.map((sc) => ({
    servCode: sc,
    reason: { kind: "alwaysAsap" as const },
  }));

  const hasUrgentGroups = urgentGroups.length > 0;
  const hasAsap = asapUrgentServCodes.length > 0;
  const hasPriority = priorityServices.length > 0;

  return (
    <div className="flex h-full overflow-hidden gap-0">
      {/* Left column: Urgent */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-border bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Urgent</span>
          {(hasUrgentGroups || hasAsap) && (
            <span className="ml-auto text-[10px] text-destructive/70 tabular-nums">
              {urgentGroups.length + asapUrgentServCodes.length} items
            </span>
          )}
        </div>

        <ScrollArea className="flex-1">
          {!hasUrgentGroups && !hasAsap ? (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
              No urgent items
            </div>
          ) : (
            <div>
              {hasAsap && (
                <div>
                  <div className="px-4 py-1.5 bg-destructive/5 border-b border-border/40">
                    <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
                      Always ASAP
                    </span>
                  </div>
                  <UrgentChecklistContent urgentServCodes={asapUrgentServCodes} />
                </div>
              )}

              {hasUrgentGroups && (
                <div>
                  <div className="px-4 py-1.5 bg-destructive/5 border-b border-border/40">
                    <span className="text-[10px] font-semibold text-destructive uppercase tracking-wide">
                      Overdue / Unplanned Groups
                    </span>
                  </div>
                  {urgentGroups.map((group) => (
                    <UrgentGroupRow key={group.groupId} group={group} />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right column: Priority Scheduling */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-border bg-primary/10">
          <CalendarClock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Priority Scheduling</span>
          {hasPriority && (
            <span className="ml-auto text-[10px] text-primary/70 tabular-nums">
              {priorityServices.length} service{priorityServices.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <ScrollArea className="flex-1">
          {hasPriority ? (
            <PriorityChecklistContent priorityServices={priorityServices} />
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
              No priority services
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
