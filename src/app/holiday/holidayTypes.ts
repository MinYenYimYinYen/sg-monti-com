import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type Holiday = CreatedUpdated & {
  holidayId: string;
  description: string;
  /** Single day = min === max */
  dateRange: TRange<string>;
  /**
   * When true, this holiday is a weather/environmental closure (e.g. "Rain Day", "Too Windy").
   * Weather days are excluded from productivity completion % denominators and
   * suspicious-zero-day detection in reliabilitySelect.
   */
  isWeatherDay: boolean;
};
