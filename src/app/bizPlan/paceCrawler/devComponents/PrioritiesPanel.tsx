"use client";

import { useSelector } from "react-redux";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { urgentServCodesSelect } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentServCodesSelect";
import { UrgentChecklistContent } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/UrgentServCodeCard";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { PriorityChecklistContent } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/PriorityServiceCard";
import { ScrollArea } from "@/style/components/scroll-area";

// ---------------------------------------------------------------------------
// PrioritiesPanel — two-column layout for Urgent and Priority checklists
// ---------------------------------------------------------------------------

export function PrioritiesPanel() {
  const asapServCodes = useSelector(urgentServCodesSelect.alwaysAsapServCodes);
  const overdueServCodes = useSelector(urgentServCodesSelect.overdueServCodes);
  const priorityServices = useSelector(priorityServiceSelect.priorityServices);

  const hasUrgent = asapServCodes.length > 0 || overdueServCodes.length > 0;
  const hasPriority = priorityServices.length > 0;

  return (
    <div className="flex h-full overflow-hidden gap-0">
      {/* ── Left column: Urgent checklist ── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        {/* Column header */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-border bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-sm font-semibold text-destructive">Urgent</span>
          {hasUrgent && (
            <span className="ml-auto text-[10px] text-destructive/70 tabular-nums">
              {asapServCodes.length + overdueServCodes.length} servCode{asapServCodes.length + overdueServCodes.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Checklist body */}
        <ScrollArea className="flex-1">
          {hasUrgent ? (
            <UrgentChecklistContent
              asapServCodes={asapServCodes}
              overdueServCodes={overdueServCodes}
            />
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground italic">
              No urgent services
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Right column: Priority scheduling checklist ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Column header */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-3 border-b border-border bg-primary/10">
          <CalendarClock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Priority Scheduling</span>
          {hasPriority && (
            <span className="ml-auto text-[10px] text-primary/70 tabular-nums">
              {priorityServices.length} service{priorityServices.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Checklist body */}
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
