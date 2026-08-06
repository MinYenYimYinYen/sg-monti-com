import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type PlannedTimeOff = CreatedUpdated & {
  plannedTimeOffId: string;
  employeeId: string;
  /** Single day = min === max */
  dateRange: TRange<string>;
  note: string;
};
