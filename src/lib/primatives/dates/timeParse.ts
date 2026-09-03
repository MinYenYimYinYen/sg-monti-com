// ---------------------------------------------------------------------------
// timeParse — parses human-readable time strings into "HH:mm:ss" format.
//
// Accepted formats (case-insensitive):
//   10am, 10pm, 10:30am, 10:30 PM, 14:30, 14:30:00, 930am, noon, midnight
//
// Output: "HH:mm:ss" (24-hour, zero-padded) or undefined if unparseable.
// ---------------------------------------------------------------------------

function tryParseTime(timeString: string): string | undefined {
  const text = timeString.trim().toLowerCase();
  if (!text) return undefined;

  // Semantic keywords
  if (text === "noon") return "12:00:00";
  if (text === "midnight") return "00:00:00";

  // Normalize: remove spaces between digits and am/pm
  const normalized = text.replace(/\s+/g, "");

  // Match patterns:
  //   14:30:00  (HH:mm:ss, 24-hour)
  //   14:30     (HH:mm, 24-hour)
  //   10:30am   (h:mm am/pm)
  //   10am      (h am/pm)
  //   930am     (hmm am/pm, compact)

  const withColonAmPm = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(am|pm)$/);
  if (withColonAmPm) {
    const [, hStr, mStr, sStr, meridiem] = withColonAmPm;
    return buildTime(parseInt(hStr, 10), parseInt(mStr, 10), parseInt(sStr ?? "0", 10), meridiem as "am" | "pm");
  }

  const withColon24 = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (withColon24) {
    const [, hStr, mStr, sStr] = withColon24;
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const s = parseInt(sStr ?? "0", 10);
    if (h > 23 || m > 59 || s > 59) return undefined;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  const compactAmPm = normalized.match(/^(\d{1,4})(am|pm)$/);
  if (compactAmPm) {
    const [, digits, meridiem] = compactAmPm;
    let h: number;
    let m: number;
    if (digits.length <= 2) {
      // e.g. "10am" → h=10, m=0
      h = parseInt(digits, 10);
      m = 0;
    } else {
      // e.g. "930am" → h=9, m=30  or "1030am" → h=10, m=30
      m = parseInt(digits.slice(-2), 10);
      h = parseInt(digits.slice(0, -2), 10);
    }
    return buildTime(h, m, 0, meridiem as "am" | "pm");
  }

  return undefined;
}

function buildTime(h: number, m: number, s: number, meridiem: "am" | "pm"): string | undefined {
  if (m > 59 || s > 59) return undefined;

  let hour = h;
  if (meridiem === "am") {
    if (hour === 12) hour = 0; // 12am → 00:xx:xx
    if (hour > 12) return undefined;
  } else {
    if (hour === 12) hour = 12; // 12pm → 12:xx:xx
    else hour += 12;
    if (hour > 23) return undefined;
  }

  return `${pad(hour)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export const timeParser = {
  tryParseTime,
};
