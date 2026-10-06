import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

export type AvailabilityStatus =
  | { kind: "available" }
  | { kind: "not_started"; startDate: string }
  | { kind: "ended"; endDate: string };

export function formatDollars(n: number | null): string {
  if (n === null) return "—";
  if (!isFinite(n)) return "∞";
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export function computeDaysLate(pool: number, teamRate: number, deadlineWeekdays: number): number | null {
  if (teamRate <= 0) return null;
  return Math.round(pool / teamRate - deadlineWeekdays);
}

export function getAvailabilityStatus(availability: EmployeeAvailability, mainDate: string): AvailabilityStatus {
  if (availability.startDate && mainDate < availability.startDate) {
    return { kind: "not_started", startDate: availability.startDate };
  }
  if (availability.endDate && mainDate > availability.endDate) {
    return { kind: "ended", endDate: availability.endDate };
  }
  return { kind: "available" };
}
