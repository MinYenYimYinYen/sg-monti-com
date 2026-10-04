import { ServCodeTimelineEvent } from "@/app/pace/PaceEngineTypes";

export function formatDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function formatDollars(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function eventDescription(event: ServCodeTimelineEvent): { text: string; color: string } {
  switch (event.kind) {
    case "starts":
      return { text: "starts", color: "text-accent" };
    case "returns":
      return {
        text: event.fromGroupId ? `returns (from ${event.fromGroupId})` : "returns",
        color: "text-accent",
      };
    case "leaves":
      return {
        text: event.toGroupId ? `leaves → ${event.toGroupId}` : "leaves",
        color: "text-muted-foreground",
      };
    case "finishes":
      return { text: "finishes (pool drained)", color: "text-primary" };
  }
}
