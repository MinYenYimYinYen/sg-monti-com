function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Today as Claude reads it: the weekday and spelled-out date, then the ISO form. Day resolution on
 * purpose, with no time of day. Uses the clock's local date; the clock is passed in so this stays pure.
 */
export function formatToday({ now }: { now: Date }): string {
  const spelledOut = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const iso = `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
  return `Today is ${spelledOut} (${iso}).`;
}
