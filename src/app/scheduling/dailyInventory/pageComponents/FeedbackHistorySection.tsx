"use client";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadoutSelect } from "@/app/loadout/loadoutSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { useLoadout } from "@/app/loadout/useLoadout";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/style/components/accordion";

export function FeedbackHistorySection() {
  const router = useRouter();
  const { getLoadoutKeys } = useLoadout();
  const keysByEmployee = useSelector(loadoutSelect.loadoutKeysByEmployee);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  // Fetch all loadout keys for the current season on mount
  useEffect(() => {
    const year = new Date().getFullYear();
    getLoadoutKeys({ min: `${year}-01-01`, max: `${year}-12-31` });
  }, [getLoadoutKeys]);

  const employees = Array.from(keysByEmployee.entries()).sort(([a], [b]) => {
    const nameA = employeeMap.get(a)?.name ?? a;
    const nameB = employeeMap.get(b)?.name ?? b;
    return nameA.localeCompare(nameB);
  });

  if (employees.length === 0) {
    return <p className="text-sm text-foreground/40 italic">No finished loadouts yet.</p>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {employees.map(([employeeId, routeDates]) => {
        const name = employeeMap.get(employeeId)?.name ?? employeeId;
        return (
          <AccordionItem key={employeeId} value={employeeId}>
            <AccordionTrigger className={"py-2"}>
              <span className="font-semibold text-foreground">{name}</span>
              <span className="text-xs text-foreground/50 ml-2 mr-auto">
                {routeDates.length} loadout{routeDates.length !== 1 ? "s" : ""}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1 pb-2">
                {routeDates.map((routeDate) => (
                  <button
                    key={routeDate}
                    onClick={() =>
                      router.push(
                        `/scheduling/dailyInventory/loadoutFeedback/${employeeId}/${routeDate}`,
                      )
                    }
                    className="flex items-center justify-between rounded-md px-3 py-1 text-sm hover:bg-accent/10 transition-colors text-left"
                  >
                    <span className="text-foreground">
                      {prettyDate(routeDate, "eee, MMM dd, yyyy")}
                    </span>
                    <span className="text-primary text-xs font-medium">View →</span>
                  </button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
