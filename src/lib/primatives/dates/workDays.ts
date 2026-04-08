/**
 * Returns a date string (YYYY-MM-DD) representing 'n' work days before the given date.
 */
function workDaysAgo(date: string, days: number): string {
  const current = new Date(date);
  let daysRemaining = days;

  while (daysRemaining > 0) {
    // Move back one calendar day
    current.setDate(current.getDate() - 1);

    // Check if it's a weekday (Monday = 1, ..., Friday = 5)
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysRemaining--;
    }
  }

  return current.toISOString().split("T")[0];
}

/**
 * Returns a date string (YYYY-MM-DD) representing 'n' work days after the given date.
 */
function workDaysFromNow(date: string, days: number): string {
  const current = new Date(date);
  let daysRemaining = days;

  while (daysRemaining > 0) {
    // Move forward one calendar day
    current.setDate(current.getDate() + 1);

    // Check if it's a weekday
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysRemaining--;
    }
  }

  return current.toISOString().split("T")[0];
}

export const workDays = {
  workDaysAgo,
  workDaysFromNow,
};