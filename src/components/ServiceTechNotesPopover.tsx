import { Info } from "lucide-react";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";

type ServiceTechNotesPopoverProps = {
  service: Service;
  /** Optional extra note to display first (e.g. a priority service note). */
  extraNote?: string;
};

export function ServiceTechNotesPopover({ service, extraNote }: ServiceTechNotesPopoverProps) {
  const { servNote, progNote, custNote } = service.x.techNotes;
  const hasNotes = !!(extraNote || custNote || progNote || servNote);
  if (!hasNotes) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="primary"
          intensity="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-xs space-y-2" align="start">
        {extraNote && (
          <div>
            <p className="font-semibold text-foreground mb-0.5">Note</p>
            <p className="text-muted-foreground">{extraNote}</p>
          </div>
        )}
        {custNote && (
          <div>
            <p className="font-semibold text-foreground mb-0.5">Customer Note</p>
            <p className="text-muted-foreground">{custNote}</p>
          </div>
        )}
        {progNote && (
          <div>
            <p className="font-semibold text-foreground mb-0.5">Program Note</p>
            <p className="text-muted-foreground">{progNote}</p>
          </div>
        )}
        {servNote && (
          <div>
            <p className="font-semibold text-foreground mb-0.5">Service Note</p>
            <p className="text-muted-foreground">{servNote}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
