"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { urgentServCodesSelect } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentServCodesSelect";
import { urgentActions } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentSlice";
import { AppDispatch } from "@/store";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Number } from "@/components/Number";
import { AlertTriangle, Clock, Info, ClipboardList, LandPlot, Eye, EyeOff } from "lucide-react";
import { cn } from "@/style/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Checkbox } from "@/style/components/checkbox";

// ---------------------------------------------------------------------------
// ChecklistServiceRow
// ---------------------------------------------------------------------------

function ChecklistServiceRow({
  service,
  servCodeId,
}: {
  service: Service;
  servCodeId: string;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const checkedServIds = useSelector(urgentServCodesSelect.checkedServIds);
  const checked = checkedServIds.includes(service.servId);

  const customer = service.program.customer;
  const city = customer.address.city ?? "";
  const zip = customer.address.zip ?? "";
  const location = [zip, city].filter(Boolean).join(" ");
  const allTechNotes = service.x.allTechNotes;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs py-0.5 border-b border-border/20 last:border-0",
        checked && "opacity-40",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => dispatch(urgentActions.toggleChecked(service.servId))}
        className="shrink-0"
      />
      <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-14 truncate">
        {servCodeId}
      </span>
      <span className="flex-1 min-w-0 truncate">
        <CustomerLink
          customerId={customer.custId}
          customerTab="customer"
          className="font-medium text-primary hover:underline"
        >
          {customer.displayName}
        </CustomerLink>
        {location && (
          <span className="text-muted-foreground"> · {location}</span>
        )}
      </span>
      <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
        <LandPlot className="w-3 h-3" />
        <Number decimals={0}>{service.size}</Number>
      </span>
      {allTechNotes.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground shrink-0 cursor-default">
                <Info className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="p-0 max-w-none">
              <div className="flex gap-2 p-2">
                {allTechNotes.map((techNote, idx) => (
                  <div key={idx} className="w-72 text-xs whitespace-pre-wrap">
                    {techNote}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChecklistPopover
// ---------------------------------------------------------------------------

function ChecklistPopover({
  asapServCodes,
  overdueServCodes,
  showOverdue,
}: {
  asapServCodes: ServCodeDeep[];
  overdueServCodes: ServCodeDeep[];
  showOverdue: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const expandedServCodeIds = useSelector(urgentServCodesSelect.expandedServCodeIds);
  const visibleServCodes = showOverdue
    ? [...asapServCodes, ...overdueServCodes]
    : asapServCodes;

  return (
    <Accordion
      type="multiple"
      value={expandedServCodeIds}
      onValueChange={(values) => {
        const added = values.filter((v) => !expandedServCodeIds.includes(v));
        const removed = expandedServCodeIds.filter((v) => !values.includes(v));
        for (const id of added) dispatch(urgentActions.toggleExpanded(id));
        for (const id of removed) dispatch(urgentActions.toggleExpanded(id));
      }}
      className="w-full"
    >
      {visibleServCodes.map((servCode) => {
        const unfinished = servCode.services.filter((s) => s.x.isActionable);
        if (unfinished.length === 0) return null;

        return (
          <AccordionItem
            key={servCode.servCodeId}
            value={servCode.servCodeId}
            className="border-b border-border/40 last:border-0"
          >
            <AccordionTrigger className="py-2 px-3 text-xs font-mono hover:no-underline hover:bg-accent/10 [&[data-state=open]>svg]:rotate-180">
              <span className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-semibold text-foreground truncate">
                  {servCode.servCodeId}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {unfinished.length} service{unfinished.length !== 1 ? "s" : ""}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-2 pt-0">
              <div>
                {unfinished.map((service) => (
                  <ChecklistServiceRow
                    key={service.servId}
                    service={service}
                    servCodeId={servCode.servCodeId}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// UrgentServCodeRow
// ---------------------------------------------------------------------------

function UrgentServCodeRow({
  servCode,
  isAsap,
}: {
  servCode: ServCodeDeep;
  isAsap: boolean;
}) {
  const unprintedCount = servCode.services.filter((service) => service.x.isActionable).length;
  if (unprintedCount === 0) return null;

  return (
    <div className="w-full py-1.5 flex items-center gap-2 px-1">
      {isAsap ? (
        <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
      ) : (
        <Clock className="w-3 h-3 text-destructive shrink-0" />
      )}

      <span className="font-mono text-xs text-foreground flex-1 truncate">
        {servCode.servCodeId}
      </span>

      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-wide px-1 rounded shrink-0",
          isAsap
            ? "bg-destructive/20 text-destructive"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {isAsap ? "ASAP" : "LATE"}
      </span>

      <span className="text-xs font-mono text-muted-foreground shrink-0">
        <Number decimals={0}>{unprintedCount}</Number>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UrgentServCodeCard
// ---------------------------------------------------------------------------

export function UrgentServCodeCard() {
  const dispatch = useDispatch<AppDispatch>();
  const asapServCodes = useSelector(urgentServCodesSelect.alwaysAsapServCodes);
  const overdueServCodes = useSelector(urgentServCodesSelect.overdueServCodes);
  const showOverdue = useSelector(urgentServCodesSelect.showOverdue);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const asapCount = asapServCodes.length;
  const overdueCount = overdueServCodes.length;
  const visibleCount = asapCount + (showOverdue ? overdueCount : 0);

  if (asapCount === 0 && overdueCount === 0) return null;

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b rounded-t-lg bg-destructive/10">
        <span className="text-sm font-semibold text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Urgent
        </span>
        <div className="flex items-center gap-2">
          {/* Toggle overdue visibility */}
          {overdueCount > 0 && (
            <button
              onClick={() => dispatch(urgentActions.toggleShowOverdue())}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded px-1.5 py-0.5 transition-colors"
              title={showOverdue ? "Hide overdue servCodes" : `Show ${overdueCount} overdue servCode${overdueCount !== 1 ? "s" : ""}`}
            >
              {showOverdue ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              <span>
                {showOverdue ? "Hide Late" : `Late (${overdueCount})`}
              </span>
            </button>
          )}

          <Popover open={checklistOpen} onOpenChange={setChecklistOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded px-1.5 py-0.5 transition-colors">
                <ClipboardList className="w-3.5 h-3.5" />
                Checklist
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <div className="bg-popover rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b bg-destructive/10">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Route Checklist
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Check off services as you build routes
                  </p>
                </div>
                <div className="max-h-[624px] overflow-y-auto">
                  <ChecklistPopover
                    asapServCodes={asapServCodes}
                    overdueServCodes={overdueServCodes}
                    showOverdue={showOverdue}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 px-2 py-1 divide-y divide-border/30">
        {asapServCodes.map((servCode) => (
          <UrgentServCodeRow key={servCode.servCodeId} servCode={servCode} isAsap={true} />
        ))}
        {showOverdue && overdueServCodes.map((servCode) => (
          <UrgentServCodeRow key={servCode.servCodeId} servCode={servCode} isAsap={false} />
        ))}
      </div>
    </div>
  );
}
