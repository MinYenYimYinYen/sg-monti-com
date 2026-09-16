"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { EmployeeTimelineEvent } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";
import { EmployeeAvailabilitySheet } from "@/app/employeeAvailability/_components/EmployeeAvailabilitySheet";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { CalendarClock } from "lucide-react";

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function eventLabel(event: EmployeeTimelineEvent): { text: string; color: string } {
  switch (event.kind) {
    case "starts":
      return {
        text: event.fromEntryLabel != null
          ? `starts ${event.entryLabel} (from ${event.fromEntryLabel})`
          : `starts ${event.entryLabel}`,
        color: "text-accent",
      };
    case "finishes":
      return {
        text: `finishes ${event.entryLabel}`,
        color: "text-primary",
      };
    case "switches":
      return {
        text: `switches ${event.fromEntryLabel} → ${event.toEntryLabel}`,
        color: "text-secondary",
      };
    case "downtime":
      return {
        text: "downtime (no eligible work)",
        color: "text-muted-foreground",
      };
  }
}

export { EmployeeTimelinePanel as EmployeeTimeLine };

export function EmployeeTimelinePanel() {
  const timelineMap = useSelector(paceCrawlerSelect.employeeTimelineMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [availabilitySheetEmployee, setAvailabilitySheetEmployee] = useState<Employee | null>(null);

  // Only show employees that have timeline data
  const employeesWithTimeline = [...timelineMap.entries()]
    .filter(([, events]) => events.length > 0)
    .map(([employeeId]) => ({
      employeeId,
      name: employeeMap.get(employeeId)?.name ?? employeeId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedTimeline = selectedEmployeeId
    ? (timelineMap.get(selectedEmployeeId) ?? [])
    : [];

  const selectedEmployee = selectedEmployeeId ? employeeMap.get(selectedEmployeeId) ?? null : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee selector */}
      <div className="w-48 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Employees</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {employeesWithTimeline.map(({ employeeId, name }) => {
            const emp = employeeMap.get(employeeId);
            const hasAvailability = !!(emp?.availability.startDate || emp?.availability.endDate);
            return (
              <div key={employeeId} className="flex items-center group">
                <button
                  onClick={() => setSelectedEmployeeId(employeeId)}
                  className={`flex-1 text-left px-3 py-1.5 text-xs transition-colors ${
                    selectedEmployeeId === employeeId
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent/10"
                  }`}
                >
                  {name}
                </button>
                {emp && (
                  <button
                    onClick={() => setAvailabilitySheetEmployee(emp)}
                    className={`p-1 mr-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                      hasAvailability
                        ? "text-primary opacity-100"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Edit availability"
                  >
                    <CalendarClock className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground">
          {employeesWithTimeline.length} employees
        </div>
      </div>

      {/* Right panel — timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedEmployeeId === null && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select an employee to view their schedule timeline.
          </p>
        )}

        {selectedEmployeeId !== null && (
          <>
            <p className="text-xs font-semibold text-foreground mb-1">
              {employeeMap.get(selectedEmployeeId)?.name ?? selectedEmployeeId}
              <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                {selectedTimeline.length} events
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {'Group entries appear as their label (e.g. "RC1+R01"). Starts/switches/finishes track entry-level transitions.'}
            </p>

            {selectedTimeline.length === 0 && (
              <p className="text-xs text-muted-foreground">No timeline events recorded.</p>
            )}

            <div className="space-y-0.5">
              {selectedTimeline.map(({ date, event }, idx) => {
                const { text, color } = eventLabel(event);
                // Highlight group-related events
                const isGroupEvent =
                  (event.kind === "starts" && event.entryLabel.includes("+")) ||
                  (event.kind === "finishes" && event.entryLabel.includes("+")) ||
                  (event.kind === "switches" &&
                    (event.fromEntryLabel.includes("+") || event.toEntryLabel.includes("+")));

                return (
                  <div
                    key={idx}
                    className={`flex items-baseline gap-3 text-xs ${isGroupEvent ? "bg-primary/5 rounded px-1" : ""}`}
                  >
                    <span className="font-mono text-muted-foreground w-10 shrink-0 text-right">
                      {formatDate(date)}
                    </span>
                    <span className={`font-mono ${color}`}>{text}</span>
                    {isGroupEvent && (
                      <span className="text-[9px] text-primary bg-primary/10 rounded px-1 shrink-0">group</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Employee Availability Sheet */}
      {availabilitySheetEmployee && (
        <EmployeeAvailabilitySheet
          employee={availabilitySheetEmployee}
          onClose={() => setAvailabilitySheetEmployee(null)}
        />
      )}
    </div>
  );
}
