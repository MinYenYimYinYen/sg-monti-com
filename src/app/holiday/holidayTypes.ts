import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type Holiday = CreatedUpdated & {
  holidayId: string;
  description: string;
  /** Single day = min === max */
  dateRange: TRange<string>;
};
