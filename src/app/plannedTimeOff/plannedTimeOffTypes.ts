import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type PlannedTimeOffRequestType = "plannedDates" | "plannedTime" | "unplannedAbsence";

export type PlannedTimeOff = CreatedUpdated & {
  plannedTimeOffId: string;
  employeeId: string;
  requestType: PlannedTimeOffRequestType;
  /** Single day = min === max. For plannedTime, this is the single date. */
  dateRange: TRange<string>;
  /** Only populated when requestType === "plannedTime". HH:mm:ss format. */
  timeRange: TRange<string> | null;
  note: string;
};
