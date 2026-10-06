"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { empTimelineSelect } from "@/app/pace/empTimeline/empTimelineSelect";
import { EmployeeAvailabilitySheet } from "@/app/employeeAvailability/_components/EmployeeAvailabilitySheet";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { CalendarClock } from "lucide-react";
import { formatDate, eventLabel } from "@/app/pace/empTimeline/_components/empTimelineHelpers";

export function EmpTimelinePage() {
  const employeeTimeline = useSelector(empTimelineSelect.employeeTimeline);
  const employeeMap = useSelector(empTimelineSelect.employeeMap);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [availabilitySheetEmployee, setAvailabilitySheetEmployee] = useState<Employee | null>(
    null,
  );

  const employeesWithTimeline = [...employeeTimeline.entries()]
    .filter(([, events]) => events.length > 0)
    .map(([employeeId]) => ({
      employeeId,
      name: employeeMap.get(employeeId)?.name ?? employeeId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedTimeline = selectedEmployeeId
    ? (employeeTimeline.get(selectedEmployeeId) ?? [])
    : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee selector */}
      <div className="w-48 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Employees
          </span>
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
          {employeesWithTimeline.length === 0 && (
            <p className="px-3 py-4 text-[10px] text-muted-foreground text-center">
              No timeline data yet. Set goals and run the engine.
            </p>
          )}
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
              Group entries appear as their groupId. Starts/switches/finishes track group-level
              transitions.
            </p>

            {selectedTimeline.length === 0 && (
              <p className="text-xs text-muted-foreground">No timeline events recorded.</p>
            )}

            <div className="space-y-0.5">
              {selectedTimeline.map(({ date, event }, idx) => {
                const { text, color } = eventLabel(event);
                const isGroupEvent = event.kind !== "downtime";
                return (
                  <div
                    key={idx}
                    className={`flex items-baseline gap-3 text-xs ${isGroupEvent ? "bg-primary/5 rounded px-1" : ""}`}
                  >
                    <span className="font-mono text-muted-foreground w-10 shrink-0 text-right">
                      {formatDate(date)}
                    </span>
                    <span className={`font-mono ${color}`}>{text}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {availabilitySheetEmployee && (
        <EmployeeAvailabilitySheet
          employee={availabilitySheetEmployee}
          onClose={() => setAvailabilitySheetEmployee(null)}
        />
      )}
    </div>
  );
}
