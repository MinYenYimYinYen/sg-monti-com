import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";

export const DEFAULT_CASCADE_THRESHOLD = 0.95;
export const CURRENT_YEAR = new Date().getFullYear();

export type FormState = {
  name: string;
  year: number;
  cascadeThreshold: number;
  snowMelt: string;
  snowDeadline: string;
  groupSchedules: { groupId: string; plannedStart: string; plannedEnd: string }[];
};

export function emptyForm(): FormState {
  return {
    name: "",
    year: CURRENT_YEAR,
    cascadeThreshold: DEFAULT_CASCADE_THRESHOLD,
    snowMelt: "",
    snowDeadline: "",
    groupSchedules: [],
  };
}

export function planToForm(plan: SeasonPlan): FormState {
  return {
    name: plan.name,
    year: plan.year,
    cascadeThreshold: plan.cascadeThreshold,
    snowMelt: plan.snowMelt ?? "",
    snowDeadline: plan.snowDeadline ?? "",
    groupSchedules: [...plan.groupSchedules],
  };
}

export function mondayOf(iso: string): Date {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addWeeks(d: Date, weeks: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

export function buildWeekMondays(startMonday: Date, endMonday: Date): string[] {
  const mondays: string[] = [];
  let current = new Date(startMonday);
  while (current <= endMonday) {
    mondays.push(toISO(current));
    current = addWeeks(current, 1);
  }
  return mondays;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export function fmtWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
  );
  return `W${weekNum}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
