"use client";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { ScrollArea } from "@/style/components/scroll-area";
import {
  CardStack,
  CardStackCard,
  CardStackHeader,
  CardStackBody,
  CardStackList,
} from "@/components/CardStack";

export function FeedbackHistorySection() {
  const router = useRouter();
  const finishedLoadoutMap = useSelector(loadoutSelect.finishedLoadoutMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  // Group finished loadouts by employeeId
  const byEmployee = new Map<string, { employeeId: string; routeDate: string }[]>();
  finishedLoadoutMap.forEach((_, key) => {
    const [employeeId, routeDate] = key.split(":");
    if (!byEmployee.has(employeeId)) byEmployee.set(employeeId, []);
    byEmployee.get(employeeId)!.push({ employeeId, routeDate });
  });

  // Sort each employee's dates descending
  byEmployee.forEach((entries) => {
    entries.sort((a, b) => b.routeDate.localeCompare(a.routeDate));
  });

  const employees = Array.from(byEmployee.entries()).sort(([a], [b]) => {
    const nameA = employeeMap.get(a)?.name ?? a;
    const nameB = employeeMap.get(b)?.name ?? b;
    return nameA.localeCompare(nameB);
  });

  if (employees.length === 0) {
    return (
      <section>
        <h2 className="text-foreground font-semibold mb-3 flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          Feedback History
        </h2>
        <p className="text-sm text-foreground/40 italic">No finished loadouts yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-foreground font-semibold mb-4 flex items-center gap-2">
        <BarChart2 className="h-4 w-4" />
        Feedback History
      </h2>
      <CardStack>
        <CardStackList>
          {employees.map(([employeeId, entries]) => {
            const name = employeeMap.get(employeeId)?.name ?? employeeId;
            return (
              <CardStackCard key={employeeId} id={employeeId}>
                <CardStackHeader>
                  <div className="p-4">
                    <p className="font-semibold text-foreground">{name}</p>
                    <p className="text-xs text-foreground/50">{entries.length} loadout{entries.length !== 1 ? "s" : ""}</p>
                  </div>
                </CardStackHeader>
                <CardStackBody>
                  <ScrollArea className="h-48 px-4 pb-4">
                    <div className="flex flex-col gap-1">
                      {entries.map(({ routeDate }) => (
                        <button
                          key={routeDate}
                          onClick={() =>
                            router.push(
                              `/scheduling/dailyInventory/loadoutFeedback/${employeeId}/${routeDate}`,
                            )
                          }
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent/10 transition-colors text-left"
                        >
                          <span className="text-foreground">
                            {prettyDate(routeDate, "eee, MMM dd, yyyy")}
                          </span>
                          <span className="text-primary text-xs font-medium">View →</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardStackBody>
              </CardStackCard>
            );
          })}
        </CardStackList>
      </CardStack>
    </section>
  );
}
