"use client";

import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import { SchedPromise, ParsedTime, ParsedDays } from "@/app/schedPromise/SchedPromiseTypes";

// ---------------------------------------------------------------------------
// Builds a compact human-readable summary from a parsed SchedPromise.
// Only includes fields that were successfully parsed (non-null).
// ---------------------------------------------------------------------------

function formatTime(time: ParsedTime): string {
  if (time.scope === "First Stop" || time.scope === "Last Stop") return time.scope;
  if (time.scope === "between") return `between ${time.start} and ${time.end}`;
  // Narrowed: scope is "at" | "before" | "after" — all have .time
  if (time.scope === "at" || time.scope === "before" || time.scope === "after") {
    return `${time.scope} ${time.time}`;
  }
  return time.scope;
}

function formatDays(days: ParsedDays): string {
  if (days.kind === "special") return days.special;
  return days.compact;
}

function buildSummary(promise: SchedPromise): string {
  const parts: string[] = [];

  if (promise.date) {
    const { scope, period, date } = promise.date;
    const periodStr = period && period !== "any day" ? `${period} ` : "";
    parts.push(`${periodStr}${scope} ${date}`);
  }

  if (promise.time) {
    parts.push(formatTime(promise.time));
  }

  if (promise.days) {
    parts.push(`days: ${formatDays(promise.days)}`);
  }

  if (promise.tech) parts.push(`tech: ${promise.tech}`);
  if (promise.equip) parts.push(`equip: ${promise.equip}`);
  if (promise.condition) parts.push(`condition: ${promise.condition}`);
  if (promise.granLiq) parts.push(promise.granLiq);
  if (promise.note) parts.push(promise.note);

  if (promise.unknownFields) {
    for (const [key, value] of Object.entries(promise.unknownFields)) {
      parts.push(`${key}: ${value}`);
    }
  }

  return parts.filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// ParsedPromiseBadge
//
// Parses a tech note and renders:
//   - A primary/30 badge with the parsed summary (if parse succeeds)
//   - Destructive badges for each parse issue (if any)
//   - Nothing if no promise pattern is found in the note
// ---------------------------------------------------------------------------

type ParsedPromiseBadgeProps = {
  techNote: string;
  entityType?: "service" | "program" | "customer";
  entityId?: number;
};

export function ParsedPromiseBadge({
  techNote,
  entityType = "customer",
  entityId = 0,
}: ParsedPromiseBadgeProps) {
  const { promise, issues } = parsePromiseString({ techNote, entityType, entityId });

  if (!promise && issues.length === 0) return null;

  const summary = promise ? buildSummary(promise) : null;

  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {summary && (
        <span className="rounded px-1.5 py-0.5 bg-primary/30 text-foreground text-[10px] font-medium">
          Parsed from note: {summary}
        </span>
      )}
      {issues.map((issue, i) => (
        <span
          key={i}
          className="rounded px-1.5 py-0.5 bg-destructive/15 text-destructive text-[10px] font-medium"
        >
          {issue}
        </span>
      ))}
    </span>
  );
}
