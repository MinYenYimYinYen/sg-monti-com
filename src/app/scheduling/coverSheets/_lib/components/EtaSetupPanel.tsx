"use client";

import { useState } from "react";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { ScrollArea } from "@/style/components/scroll-area";
import { EtaServiceRow } from "@/app/scheduling/coverSheets/_lib/components/EtaServiceRow";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";

type EtaSetupPanelProps = {
  serviceByEmployee: Map<string, Service[]>;
  /** Map<employeeId | "__day__", RouteNote[]> for this date. */
  notesByEmployee?: Map<string, RouteNote[]>;
};

function getEtaStatus(services: Service[]) {
  const etaServices = services.filter(
    (s) =>
      s.callAhead?.hasEta ||
      s.program.callAhead?.hasEta ||
      s.program.customer.callAhead?.hasEta,
  );
  const filled = etaServices.filter((s) => (s.eta ?? "").length > 0);
  return { needed: etaServices.length, filled: filled.length };
}

export function EtaSetupPanel({ serviceByEmployee, notesByEmployee }: EtaSetupPanelProps) {
  const [openItem, setOpenItem] = useState<string>("");

  const dayNotes = (notesByEmployee?.get("__day__") ?? []).filter((n) => n.note);

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Day-level notes — above the employee accordion */}
      {dayNotes.length > 0 && (
        <div className="flex flex-col gap-1 px-1 py-2 rounded-md bg-primary/10 border border-primary/20 text-sm shrink-0">
          {dayNotes.map((n) => (
            <p key={n.routeNoteId}>
              <span className="font-semibold">Route Note: </span>
              {n.note}
            </p>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        <Accordion
          type="single"
          collapsible
          value={openItem}
          onValueChange={setOpenItem}
          className="w-full"
        >
          {[...serviceByEmployee.keys()].map((employeeId) => {
            const services = serviceByEmployee.get(employeeId)!;
            const { needed, filled } = getEtaStatus(services);
            const allFilled = needed === 0 || filled === needed;
            const employeeNotes = (notesByEmployee?.get(employeeId) ?? []).filter((n) => n.note);

            return (
              <AccordionItem key={employeeId} value={employeeId}>
                <AccordionTrigger className="px-1 font-semibold">
                  <span className="flex items-center gap-3">
                    <span>{employeeId}</span>
                    {needed > 0 && (
                      <span
                        className={`text-xs font-mono ${allFilled ? "text-accent" : "text-destructive"}`}
                      >
                        {filled}/{needed} ETA
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-1">
                  {/* Employee route notes — above the service list */}
                  {employeeNotes.length > 0 && (
                    <div className="flex flex-col gap-1 mb-2 p-2 rounded-md bg-secondary/10 border border-secondary/20 text-xs">
                      {employeeNotes.map((n) => (
                        <p key={n.routeNoteId}>
                          <span className="font-semibold">Route Note: </span>
                          {n.note}
                        </p>
                      ))}
                    </div>
                  )}
                  {services.map((service) => (
                    <EtaServiceRow key={service.servId} service={service} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
