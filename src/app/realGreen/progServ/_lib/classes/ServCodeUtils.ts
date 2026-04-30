import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";

export class ServCodeUtils {
  constructor(private readonly servCode: Omit<ServCode, "x">) {}

  public get daysPlanned(): number {
    if (!dateRanges.isValidDateRange(this.servCode.dateRange)) return 1;
    return dateRanges.countWeekdays(this.servCode.dateRange);
  }

  public get daysRemaining(): number {
    if (!dateRanges.isValidDateRange(this.servCode.dateRange)) return 1;
    const today = dateStrings.todayToWeekday();
    const rangeFromToday = dateRanges.dateRangeFromDate(
      this.servCode.dateRange,
      today,
    );
    if (rangeFromToday === null) return 1; // We're past the end of the range
    return dateRanges.countWeekdays(rangeFromToday);
  }

  public get daysElapsed(): number {
    if (!dateRanges.isValidDateRange(this.servCode.dateRange)) return 1;
    const today = dateStrings.todayToWeekday();
    const rangeToToday = dateRanges.dateRangeToDate(
      this.servCode.dateRange,
      today,
    );
    if (rangeToToday === null) return 1; // Before range start — clamp to 1 to avoid divide-by-zero
    return dateRanges.countWeekdays(rangeToToday);
  }
}
