import { addMonths, format, getMonth, getYear, startOfMonth, subMonths } from "date-fns";

/** `month` is 1-12. */
export type MonthOfYearValue = {
  year: number;
  month: number;
};

const MONTHS_BACK = 18;
const MONTHS_FORWARD = 1;

export function monthOfYearFromDate(date: Date): MonthOfYearValue {
  return { year: getYear(date), month: getMonth(date) + 1 };
}

/** Every selectable month, oldest first: 18 months back through 1 month forward of `today`. */
export function monthOfYearOptions({ today }: { today: Date }): MonthOfYearValue[] {
  const anchor = startOfMonth(today);
  const options: MonthOfYearValue[] = [];
  for (let offset = -MONTHS_BACK; offset <= MONTHS_FORWARD; offset++) {
    const date = offset < 0 ? subMonths(anchor, -offset) : addMonths(anchor, offset);
    options.push(monthOfYearFromDate(date));
  }
  return options;
}

export function yearsOfOptions(options: MonthOfYearValue[]): number[] {
  return [...new Set(options.map((o) => o.year))];
}

export function monthsForYear({
  options,
  year,
}: {
  options: MonthOfYearValue[];
  year: number;
}): number[] {
  return options.filter((o) => o.year === year).map((o) => o.month);
}

/** Keeps `month` when the year allows it, otherwise picks the closest allowed month. */
export function clampMonthForYear({
  options,
  year,
  month,
}: {
  options: MonthOfYearValue[];
  year: number;
  month: number;
}): number {
  const allowed = monthsForYear({ options, year });
  if (allowed.length === 0 || allowed.includes(month)) return month;
  return allowed.reduce((closest, candidate) =>
    Math.abs(candidate - month) < Math.abs(closest - month) ? candidate : closest,
  );
}

export function monthName(month: number): string {
  return format(new Date(2000, month - 1, 1), "MMMM");
}
