import { parseISO, getWeek } from "date-fns";

/**
 * Returns the week number based on the SG Corp CSV logic:
 * - Week 1 starts on January 1st.
 * - Weeks start on Sunday (mapped to 1 in your CSV).
 */
export function getWeekNumber(dateString: string): number {
  const date = parseISO(dateString);

  // In date-fns, getWeek(date, options)
  // weekStartsOn: 0 is Sunday (matches CSV's '1' for Sunday logic)
  // firstWeekContainsDate: 1 ensures Jan 1st is always in Week 1
  return getWeek(date, {
    weekStartsOn: 0,
    firstWeekContainsDate: 1,
  });
}