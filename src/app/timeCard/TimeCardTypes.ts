/** A single clock-in/clock-out segment within a day's time card record. */
export type PunchSegment = {
  inTime: string;   // "HH:mm:00" 24h, or "" if missing (missed clock-in)
  outTime: string;  // "HH:mm:00" 24h, or "" if missing (missed clock-out)
};

/**
 * A day-level time card record for one employee.
 * `punchId` (= RealGreen TimeHeadId) is unique per employee per day and
 * serves as the natural storage key.
 * Most days have exactly one segment; split shifts produce multiple segments.
 */
export type Punch = {
  punchId: number;          // TimeHeadId — natural key
  employeeId: string;
  punchDate: string;        // "yyyy-MM-dd"
  segments: PunchSegment[];
};

/**
 * Intermediate parse target produced by the CSV parser — one row per CSV line.
 * Multiple rows with the same punchId are grouped into a single Punch by
 * groupPunchRows() after parsing.
 */
export type CsvPunchRow = {
  punchId: number;
  employeeId: string;
  punchDate: string;
  inTime: string;
  outTime: string;
};

/**
 * Groups flat CsvPunchRow[] (one per CSV line) into Punch[] (one per day per employee).
 * Rows are grouped by punchId; segments are ordered by inTime ascending.
 */
export function groupPunchRows(rows: CsvPunchRow[]): Punch[] {
  const map = new Map<number, Punch>();

  for (const row of rows) {
    const existing = map.get(row.punchId);
    const segment: PunchSegment = { inTime: row.inTime, outTime: row.outTime };

    if (existing) {
      existing.segments.push(segment);
    } else {
      map.set(row.punchId, {
        punchId: row.punchId,
        employeeId: row.employeeId,
        punchDate: row.punchDate,
        segments: [segment],
      });
    }
  }

  // Sort segments within each punch by inTime ascending
  for (const punch of map.values()) {
    punch.segments.sort((a, b) => a.inTime.localeCompare(b.inTime));
  }

  return Array.from(map.values());
}
