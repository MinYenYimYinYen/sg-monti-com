/** Converts a total minutes value to "h:mm" format. E.g. 150 → "2:30", 0 → "0:00" */
export function minutesToHoursMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
