"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { EmployeeTimelineEvent } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function eventLabel(event: EmployeeTimelineEvent): { text: string; color: string } {
  switch (event.kind) {
    case "starts":
      return {
        text: event.fromServCodeId
          ? `starts ${event.servCodeId} (from ${event.fromServCodeId})`
          : `starts ${event.servCodeId}`,
        color: "text-accent",
      };
    case "finishes":
      return {
        text: `finishes ${event.servCodeId}`,
        color: "text-primary",
      };
    case "switches":
      return {
        text: `switches ${event.fromServCodeId} → ${event.toServCodeId}`,
        color: "text-secondary",
      };
    case "downtime":
      return {
        text: "downtime (no eligible work)",
        color: "text-muted-foreground",
      };
  }
}

export function EmployeeTimelinePanel() {
  const timelineMap = useSelector(paceCrawlerSelect.employeeTimelineMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — employee selector */}
      <div className="w-48 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Employees</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {employeesWithTimeline.map(({ employeeId, name }) => (
            <button
              key={employeeId}
              onClick={() => setSelectedEmployeeId(employeeId)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                selectedEmployeeId === employeeId
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent/10"
              }`}
            >
              {name}
            </button>
          ))}
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
            <p className="text-xs font-semibold text-foreground mb-3">
              {employeeMap.get(selectedEmployeeId)?.name ?? selectedEmployeeId}
              <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                {selectedTimeline.length} events
              </span>
            </p>

            {selectedTimeline.length === 0 && (
              <p className="text-xs text-muted-foreground">No timeline events recorded.</p>
            )}

            <div className="space-y-0.5">
              {selectedTimeline.map(({ date, event }, idx) => {
                const { text, color } = eventLabel(event);
                return (
                  <div key={idx} className="flex items-baseline gap-3 text-xs">
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
    </div>
  );
}
