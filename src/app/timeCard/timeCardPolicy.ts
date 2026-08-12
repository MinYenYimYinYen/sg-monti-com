/**
 * Labor policy constants for time card computation.
 * Hardcoded for now, structured for future globalSettings integration.
 * The TimeCard class accepts an optional TimeCardPolicy and defaults to
 * defaultTimeCardPolicy when none is provided.
 */
export type TimeCardPolicy = {
  /** Minutes per week before overtime kicks in. Default: 2400 (40 hours). */
  weeklyOvertimeThresholdMinutes: number;
  /** outTime value that indicates an auto-punch-out by the external system. "HH:mm:00" */
  suspectOutTime: string;
  /** inTime value that indicates an auto-punch-in by the external system. "HH:mm:00" */
  suspectInTime: string;
};

export const defaultTimeCardPolicy: TimeCardPolicy = {
  weeklyOvertimeThresholdMinutes: 2400,
  suspectOutTime: "23:59:00",
  suspectInTime: "00:00:00",
};
