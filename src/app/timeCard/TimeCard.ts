import { Punch, PunchSegment } from "@/app/timeCard/TimeCardTypes";
import {
  TimeCardPolicy,
  defaultTimeCardPolicy,
} from "@/app/timeCard/timeCardPolicy";
import { getWeekNumber } from "@/lib/primatives/dates/getWeek";
import { parseISO, getYear } from "date-fns";

/**
 * Pure computation class for time card data.
 * No Redux, no side effects. Constructed with a filtered Punch[] and optional policy.
 * Instantiate wherever reporting is needed — selectors provide the raw Punch[].
 */
export class TimeCard {
  private readonly punches: Punch[];
  private readonly policy: TimeCardPolicy;

  constructor(punches: Punch[], policy?: TimeCardPolicy) {
    this.punches = punches;
    this.policy = policy ?? defaultTimeCardPolicy;
  }

  /**
   * Groups punches by employeeId. Within each employee, punches are sorted
   * ascending by punchDate — prerequisite for multi-punch-per-day suspect detection.
   */
  get byEmployee(): Map<string, Punch[]> {
    const map = new Map<string, Punch[]>();
    for (const punch of this.punches) {
      const existing = map.get(punch.employeeId);
      if (existing) {
        existing.push(punch);
      } else {
        map.set(punch.employeeId, [punch]);
      }
    }
    for (const [, employeePunches] of map) {
      employeePunches.sort((a, b) => a.punchDate.localeCompare(b.punchDate));
    }
    return map;
  }

  /**
   * Returns punches that cannot be persisted to storage:
   * - Any segment has an empty inTime or outTime (missed clock-in/out)
   * - Any two segments overlap in time (data integrity violation)
   *
   * These punches are excluded from import by default and the checkbox is disabled.
   */
  get invalidPunches(): Punch[] {
    return this.punches.filter((punch) => {
      // Missing time in any segment
      const hasMissingTime = punch.segments.some(
        (seg) => seg.inTime === "" || seg.outTime === "",
      );
      if (hasMissingTime) return true;

      // Overlapping segments (only relevant when there are multiple)
      if (punch.segments.length > 1) {
        const sorted = [...punch.segments].sort((a, b) =>
          a.inTime.localeCompare(b.inTime),
        );
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i]!;
          const next = sorted[i + 1]!;
          // Overlap: current outTime > next inTime
          if (current.outTime > next.inTime) return true;
        }
      }

      return false;
    });
  }

  /**
   * Returns punches that are suspect but still persistable:
   * - Multiple segments in a day (split shift — unusual, worth reviewing)
   * - Sentinel inTime (00:00:00) or outTime (23:59:00) on any segment
   *
   * Invalid punches are excluded from this list — they are handled separately.
   */
  get suspectPunches(): Punch[] {
    const invalidIds = new Set(this.invalidPunches.map((p) => p.punchId));
    return this.punches.filter((punch) => {
      if (invalidIds.has(punch.punchId)) return false;

      // Multiple segments = split shift
      if (punch.segments.length > 1) return true;

      // Sentinel times on any segment
      return punch.segments.some(
        (seg) =>
          seg.inTime === this.policy.suspectInTime ||
          seg.outTime === this.policy.suspectOutTime,
      );
    });
  }

  get hasSuspectPunches(): boolean {
    return this.suspectPunches.length > 0;
  }

  get hasInvalidPunches(): boolean {
    return this.invalidPunches.length > 0;
  }

  /**
   * Computes total minutes worked for a single segment.
   * Returns 0 if either time is empty or outTime <= inTime.
   */
  private static segmentMinutes(seg: PunchSegment): number {
    if (!seg.inTime || !seg.outTime) return 0;
    const [inH, inM] = seg.inTime.split(":").map(Number);
    const [outH, outM] = seg.outTime.split(":").map(Number);
    const inTotal = (inH ?? 0) * 60 + (inM ?? 0);
    const outTotal = (outH ?? 0) * 60 + (outM ?? 0);
    return Math.max(0, outTotal - inTotal);
  }

  /**
   * Total minutes worked for a punch (sum of all segments).
   */
  private static punchMinutes(punch: Punch): number {
    return punch.segments.reduce(
      (sum, seg) => sum + TimeCard.segmentMinutes(seg),
      0,
    );
  }

  /**
   * Groups punches by employee + ISO year + week number.
   * Returns a map keyed by "employeeId|year|week" → Punch[].
   * Used internally for overtime calculation.
   */
  private get byEmployeeWeek(): Map<string, Punch[]> {
    const map = new Map<string, Punch[]>();
    for (const punch of this.punches) {
      const date = parseISO(punch.punchDate);
      const week = getWeekNumber(punch.punchDate);
      const year = getYear(date);
      const key = `${punch.employeeId}|${year}|${week}`;
      const existing = map.get(key);
      if (existing) {
        existing.push(punch);
      } else {
        map.set(key, [punch]);
      }
    }
    return map;
  }

  /**
   * Total non-overtime minutes across all punches.
   * Overtime minutes (beyond weeklyOvertimeThresholdMinutes per employee per week)
   * are excluded from this total.
   */
  get regularMinutes(): number {
    const threshold = this.policy.weeklyOvertimeThresholdMinutes;
    let total = 0;
    for (const [, weekPunches] of this.byEmployeeWeek) {
      const weekTotal = weekPunches.reduce(
        (sum, punch) => sum + TimeCard.punchMinutes(punch),
        0,
      );
      total += Math.min(weekTotal, threshold);
    }
    return total;
  }

  /**
   * Total overtime minutes across all employees and weeks.
   * Minutes beyond weeklyOvertimeThresholdMinutes in a given employee-week are overtime.
   */
  get overtimeMinutes(): number {
    const threshold = this.policy.weeklyOvertimeThresholdMinutes;
    let total = 0;
    for (const [, weekPunches] of this.byEmployeeWeek) {
      const weekTotal = weekPunches.reduce(
        (sum, punch) => sum + TimeCard.punchMinutes(punch),
        0,
      );
      if (weekTotal > threshold) {
        total += weekTotal - threshold;
      }
    }
    return total;
  }

  /** Sum of regularMinutes and overtimeMinutes. */
  get totalMinutes(): number {
    return this.regularMinutes + this.overtimeMinutes;
  }

  /**
   * Total minutes worked per calendar date.
   * Returns a map of punchDate → total minutes for that day (all segments summed).
   */
  get minutesByDate(): Map<string, number> {
    const map = new Map<string, number>();
    for (const punch of this.punches) {
      const existing = map.get(punch.punchDate) ?? 0;
      map.set(punch.punchDate, existing + TimeCard.punchMinutes(punch));
    }
    return map;
  }
}
