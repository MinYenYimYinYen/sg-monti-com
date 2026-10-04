import { EmployeeTimelineEvent } from "@/app/pace/PaceEngineTypes";

export function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function eventLabel(event: EmployeeTimelineEvent): { text: string; color: string } {
  switch (event.kind) {
    case "starts":
      return {
        text:
          event.fromGroupId != null
            ? `starts ${event.groupId} (from ${event.fromGroupId})`
            : `starts ${event.groupId}`,
        color: "text-accent",
      };
    case "finishes":
      return { text: `finishes ${event.groupId}`, color: "text-primary" };
    case "switches":
      return {
        text: `switches ${event.fromGroupId} → ${event.toGroupId}`,
        color: "text-secondary",
      };
    case "downtime":
      return { text: "downtime (no eligible work)", color: "text-muted-foreground" };
  }
}
