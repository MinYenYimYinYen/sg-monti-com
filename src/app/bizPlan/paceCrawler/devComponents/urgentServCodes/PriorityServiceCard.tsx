"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { format, parseISO } from "date-fns";
import { CalendarClock, ClipboardList, Info } from "lucide-react";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { urgentServCodesSelect } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentServCodesSelect";
import { urgentActions } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentSlice";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { Checkbox } from "@/style/components/checkbox";
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
import { AppDispatch } from "@/store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "M/d/yyyy");
  } catch {
    return isoDate;
  }
}

function formatDateDisplay(ps: PriorityService): string {
  if (ps.date) return formatDate(ps.date);
  if (ps.dateRange) {
    return `${formatDate(ps.dateRange.min)}–${formatDate(ps.dateRange.max)}`;
  }
  return "";
}

// ---------------------------------------------------------------------------
// PriorityServiceRow — one row in the checklist popover
// ---------------------------------------------------------------------------

function PriorityServiceRow({ ps }: { ps: PriorityService }) {
  const dispatch = useDispatch<AppDispatch>();
  const checkedServIds = useSelector(urgentServCodesSelect.checkedServIds);

  const service = ps.service;
  const customer = service.program.customer;
  const city = customer.address.city ?? "";
  const zip = customer.address.zip ?? "";
  const location = [zip, city].filter(Boolean).join(" ");
  const allTechNotes = service.x.allTechNotes;

  // "$" = printed/scheduled → visually checked without storing in Redux
  const isScheduled = service.status === "$";
  const isChecked = checkedServIds.includes(service.servId) || isScheduled;

  const tooltipLines: string[] = [];
  if (ps.note) tooltipLines.push(`Note: ${ps.note}`);
  if (allTechNotes.length > 0) tooltipLines.push(...allTechNotes);

  return (
    <div className="flex items-center gap-1.5 text-xs py-0.5 border-b border-border/20 last:border-0">
      <Checkbox
        checked={isChecked}
        disabled={isScheduled}
        onCheckedChange={() => {
          if (!isScheduled) {
            dispatch(urgentActions.toggleChecked(service.servId));
          }
        }}
        className="shrink-0"
      />

      {/* Customer name */}
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

      {/* ServCode */}
      <span className="font-mono text-[10px] text-muted-foreground shrink-0">
        {service.servCode.servCodeId}
      </span>

      {/* Date */}
      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
        {formatDateDisplay(ps)}
      </span>

      {/* Info tooltip for note + tech notes */}
      {tooltipLines.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-muted-foreground shrink-0 cursor-default">
                <Info className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="p-0 max-w-none">
              <div className="flex gap-2 p-2">
                {tooltipLines.map((line, idx) => (
                  <div key={idx} className="w-72 text-xs whitespace-pre-wrap">
                    {line}
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
// PriorityServiceCard
// ---------------------------------------------------------------------------

export function PriorityServiceCard() {
  const priorityServices = useSelector(
    priorityServiceSelect.priorityServices,
  );
  const [checklistOpen, setChecklistOpen] = useState(false);

  if (priorityServices.length === 0) return null;

  return (
    <div className="border rounded-lg bg-card w-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b rounded-t-lg bg-primary/10">
        <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4" />
          Priority
        </span>
        <Popover open={checklistOpen} onOpenChange={setChecklistOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 rounded px-1.5 py-0.5 transition-colors">
              <ClipboardList className="w-3.5 h-3.5" />
              Checklist
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[28rem] p-0" align="end">
            <div className="bg-popover rounded-md overflow-hidden">
              <div className="px-3 py-2 border-b bg-primary/10">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Priority Scheduling
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Check off services as you build routes
                </p>
              </div>
              <div className="max-h-[624px] overflow-y-auto px-3 py-2">
                {priorityServices.map((ps) => (
                  <PriorityServiceRow key={ps.servId} ps={ps} />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary rows */}
      <div className="flex-1 px-3 py-1 divide-y divide-border/30">
        {priorityServices.map((ps) => (
          <div
            key={ps.servId}
            className="w-full py-1.5 flex items-center gap-2"
          >
            <CalendarClock className="w-3 h-3 text-primary shrink-0" />
            <span className="flex-1 min-w-0 truncate text-xs text-foreground">
              {ps.service.program.customer.displayName}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
              {formatDateDisplay(ps)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
