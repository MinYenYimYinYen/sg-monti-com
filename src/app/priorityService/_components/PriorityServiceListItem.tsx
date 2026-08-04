import { useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import { cn } from "@/style/utils";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { PriorityService } from "@/app/priorityService/PriorityServiceTypes";

function formatDateDisplay(ps: PriorityService): string {
  const fmt = (iso: string) => {
    try {
      return format(parseISO(iso), "M/d/yyyy");
    } catch {
      return iso;
    }
  };
  if (ps.date) return fmt(ps.date);
  if (ps.dateRange) return `${fmt(ps.dateRange.min)}–${fmt(ps.dateRange.max)}`;
  return "";
}

interface PriorityServiceListItemProps {
  servId: number;
  isSelected: boolean;
  onClick: () => void;
}

export function PriorityServiceListItem({ servId, isSelected, onClick }: PriorityServiceListItemProps) {
  const priorityServiceMap = useSelector(priorityServiceSelect.priorityServiceMap);
  const ps = priorityServiceMap.get(servId);

  if (!ps) return null;

  const address = ps.service.program.customer.address;
  const cityZip = [address.city, address.zip].filter(Boolean).join(", ");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-accent/10 text-foreground",
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <CalendarClock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">
          {ps.custDisplayName || `Serv #${ps.servId}`}
        </span>
      </div>
      {cityZip && (
        <div className="text-xs text-muted-foreground truncate pl-5">
          {cityZip}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{ps.servCodeId} ({ps.service.status})</span>
        <span>·</span>
        {ps.service.status === "*" && (
          <span className="rounded px-1 py-0.5 bg-destructive/20 text-destructive font-medium leading-none">
            ASAP
          </span>
        )}
        {ps.service.isPromised && (
          <span className="rounded px-1 py-0.5 bg-secondary/20 text-secondary font-medium leading-none">
            Promised
          </span>
        )}
        <span className="tabular-nums">{formatDateDisplay(ps)}</span>
      </div>
    </button>
  );
}
