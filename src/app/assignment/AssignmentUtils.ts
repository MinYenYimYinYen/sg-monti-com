import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

/**
 * Utility class for interpreting an `AssignmentDoc[]` array.
 *
 * The assignments array is an **append-only historical log** — every meaningful
 * schedule change for a service produces a new entry. `AssignmentUtils` is the
 * single source of truth for answering questions about that log.
 *
 * See `assignment.readme.md` for the full data model and write/read rules.
 */
export class AssignmentUtils {
  constructor(private readonly assignments: AssignmentDoc[]) {}

  /**
   * The most recently uploaded assignment across all dates, determined by `createdAt`.
   * This is the "current" assignment — what the schedule looks like right now.
   * Returns null when the array is empty.
   */
  get mostRecent(): AssignmentDoc | null {
    if (this.assignments.length === 0) return null;
    return [...this.assignments].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0]!;
  }

  /**
   * The canonical assignment for a specific `schedDate`.
   * When multiple entries exist for the same date (e.g., employee was changed),
   * the one with the latest `createdAt` is authoritative.
   * Returns null when no assignment exists for that date.
   */
  canonicalForDate(schedDate: string): AssignmentDoc | null {
    const forDate = this.assignments.filter((a) => a.schedDate === schedDate);
    if (forDate.length === 0) return null;
    return forDate.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!;
  }

  /**
   * All canonical assignments — one per `(servId, schedDate)` pair.
   * For each pair, the entry with the latest `createdAt` is kept.
   * This is the deduplicated view used for completion/reliability calculations.
   */
  get canonical(): AssignmentDoc[] {
    const map = new Map<string, AssignmentDoc>();
    for (const assignment of this.assignments) {
      const key = `${assignment.servId}|${assignment.schedDate}`;
      const existing = map.get(key);
      if (!existing || assignment.createdAt > existing.createdAt) {
        map.set(key, assignment);
      }
    }
    return Array.from(map.values());
  }

  /**
   * Returns true if the incoming assignment is identical to the most recent one.
   * Used by the write handler to skip appending when nothing has changed
   * (e.g., the same service appears on every daily CSV upload unchanged).
   */
  isDuplicate(incoming: AssignmentDoc): boolean {
    const recent = this.mostRecent;
    if (!recent) return false;
    return (
      recent.employeeId === incoming.employeeId &&
      recent.schedDate === incoming.schedDate &&
      recent.sequence === incoming.sequence
    );
  }
}
