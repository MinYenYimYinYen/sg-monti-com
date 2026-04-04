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

type EtaSetupPanelProps = {
  serviceByEmployee: Map<string, Service[]>;
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

export function EtaSetupPanel({ serviceByEmployee }: EtaSetupPanelProps) {
  const [openItem, setOpenItem] = useState<string>("");

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
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
            const employee = services[0].lastAssigned.employee;
            const { needed, filled } = getEtaStatus(services);
            const allFilled = needed === 0 || filled === needed;

            return (
              <AccordionItem key={employeeId} value={employeeId}>
                <AccordionTrigger className="px-1 font-semibold">
                  <span className="flex items-center gap-3">
                    <span>{employee.name}</span>
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
