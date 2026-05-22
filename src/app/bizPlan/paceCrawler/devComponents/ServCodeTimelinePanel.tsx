"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { ServCodeTimelineEvent } from "@/app/bizPlan/paceCrawler/PaceCrawlerTypes";

function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function eventDescription(event: ServCodeTimelineEvent): { text: string; color: string } {
  switch (event.kind) {
    case "starts":
      return { text: "starts", color: "text-accent" };
    case "returns":
      return {
        text: event.fromServCode ? `returns (from ${event.fromServCode})` : "returns",
        color: "text-accent",
      };
    case "leaves":
      return {
        text: event.toServCode ? `leaves → ${event.toServCode}` : "leaves",
        color: "text-muted-foreground",
      };
    case "finishes":
      return { text: "finishes (pool drained)", color: "text-primary" };
  }
}

export { ServCodeTimelinePanel as ServCodeTimeLine };

export function ServCodeTimelinePanel() {
  const servCodeTimelineMap = useSelector(paceCrawlerSelect.servCodeTimelineMap);
  const employeeMap = useSelector(employeeSelect.employeeMap);
  const assignmentsByEmployeeId = useSelector(assignmentPlanSelect.assignmentsByEmployeeId);

  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  // Build the list of entries to show in the left panel.
  // Include all entries that have timeline events, sorted by first event date.
  const entries = [...servCodeTimelineMap.entries()]
    .filter(([, events]) => events.length > 0)
    .map(([label, events]) => ({
      label,
      firstDate: events[0]?.date ?? "",
      eventCount: events.length,
      isGroup: label.includes("+"),
    }))
    .sort((a, b) => a.firstDate.localeCompare(b.firstDate) || a.label.localeCompare(b.label));

  const selectedEvents = selectedEntry
    ? (servCodeTimelineMap.get(selectedEntry) ?? [])
    : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — entry selector */}
      <div className="w-52 shrink-0 border-r flex flex-col bg-card">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">ServCodes / Groups</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {entries.map(({ label, eventCount, isGroup }) => (
            <button
              key={label}
              onClick={() => setSelectedEntry(label)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${
                selectedEntry === label
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-accent/10"
              }`}
            >
              <span className="font-mono flex-1 truncate">{label}</span>
              {isGroup && (
                <span className="text-[9px] text-primary bg-primary/10 rounded px-1 shrink-0">group</span>
              )}
              <span className="text-[10px] text-muted-foreground shrink-0">{eventCount}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t text-[10px] text-muted-foreground">
          {entries.length} entries tracked
        </div>
      </div>

      {/* Right panel — event log */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedEntry === null && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Select a servCode or group to view its crew timeline.
          </p>
        )}

        {selectedEntry !== null && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-foreground">
                {selectedEntry}
              </p>
              {selectedEntry.includes("+") && (
                <span className="text-[9px] text-primary bg-primary/10 rounded px-1">group</span>
              )}
              <span className="text-[10px] text-muted-foreground font-normal">
                {selectedEvents.length} events
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              {"Crew transitions with pool snapshots. Team $/day = sum of all active employees' rates at that moment."}
            </p>

            {selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">No events recorded.</p>
            )}

            <table className="text-xs border-separate border-spacing-0 w-full">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="bg-accent/10">
                  <th className="text-left px-2 py-1 border border-border font-semibold">Date</th>
                  <th className="text-left px-2 py-1 border border-border font-semibold">Employee</th>
                  <th className="text-left px-2 py-1 border border-border font-semibold">Event</th>
                  <th className="text-right px-2 py-1 border border-border font-semibold">Emp $/day</th>
                  <th className="text-right px-2 py-1 border border-border font-semibold">Team $/day</th>
                  <th className="text-right px-2 py-1 border border-border font-semibold">$ Remaining</th>
                </tr>
              </thead>
              <tbody>
                {selectedEvents.map((event, idx) => {
                  const employee = employeeMap.get(event.employeeId);
                  const employeeName = employee?.name ?? event.employeeId;
                  const { text, color } = eventDescription(event);
                  const isLeaves = event.kind === "leaves";
                  const isFinishes = event.kind === "finishes";

                  return (
                    <tr
                      key={idx}
                      className={
                        isFinishes
                          ? "bg-primary/5"
                          : isLeaves
                            ? "opacity-60 hover:opacity-100"
                            : "hover:bg-accent/5"
                      }
                    >
                      <td className="px-2 py-1 border border-border font-mono text-muted-foreground">
                        {formatDate(event.date)}
                      </td>
                      <td className="px-2 py-1 border border-border">
                        {employeeName}
                      </td>
                      <td className={`px-2 py-1 border border-border font-mono ${color}`}>
                        {text}
                      </td>
                      <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                        {event.employeeDailyRate > 0 ? formatDollars(event.employeeDailyRate) : "—"}
                      </td>
                      <td className={`px-2 py-1 border border-border text-right font-mono font-semibold ${event.teamDailyRate > 0 ? "text-accent" : "text-muted-foreground"}`}>
                        {event.teamDailyRate > 0 ? formatDollars(event.teamDailyRate) : "—"}
                      </td>
                      <td className="px-2 py-1 border border-border text-right font-mono text-muted-foreground">
                        {event.poolRemaining > 0 ? formatDollars(event.poolRemaining) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
