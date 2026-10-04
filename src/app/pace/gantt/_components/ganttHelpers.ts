import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";

export const LABEL_WIDTH = 160;
export const ROW_HEIGHT = 36;
export const GROUP_GAP = 2;
export const HEADER_HEIGHT = 40;

export const GROUP_BAR_COLORS = [
  "border-l-[3px] border-l-primary",
  "border-l-[3px] border-l-secondary",
  "border-l-[3px] border-l-accent",
  "border-l-[3px] border-l-destructive",
  "border-l-[3px] border-l-[oklch(0.65_0.18_300)]",
];

export function dayOffset(from: string, to: string): number {
  const n = dateRanges.calendarDaysBetween(from, to);
  return isNaN(n) ? 0 : n;
}

export function formatMonthDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export function isValidDate(d: string | null | undefined): d is string {
  return !!d && d.length === 10 && !isNaN(new Date(d + "T00:00:00").getTime());
}

export function getMondaysInRange(start: string, end: string): string[] {
  if (!isValidDate(start) || !isValidDate(end) || start > end) return [];
  const mondays: string[] = [];
  let current = start;
  for (let i = 0; i < 7; i++) {
    const d = new Date(current + "T00:00:00");
    if (d.getDay() === 1) break;
    current = dateStrings.addDays(current, 1);
    if (current > end) return [];
  }
  while (current <= end) {
    mondays.push(current);
    current = dateStrings.addDays(current, 7);
  }
  return mondays;
}
