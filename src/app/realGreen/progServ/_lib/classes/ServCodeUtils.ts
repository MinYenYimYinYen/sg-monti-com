import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export class ServCodeUtils {
  constructor(private readonly servCode: Omit<ServCode, "x">) {}

  // public get progCodeId(): string {
  //   return this.servCode.progCodeId;
  // }

  public get weekDays(): string[] {
    const range = this.servCode.dateRange;
    let current = range.min;
    const days: string[] = [];
    while (current <= range.max) {
      if (dateStrings.isWeekDay(current)) {
        days.push(current);
      }
      current = dateStrings.addDays(current, 1);
    }
    return days;
  }

  public get daysRemaining(): number {
    const couldBeSaturday = dateStrings.today();
    const today = !dateStrings.isWeekDay(couldBeSaturday)
      ? dateStrings.nextMonday(couldBeSaturday)
      : couldBeSaturday;

    if (today > this.servCode.dateRange.max) return 1;
    if (today < this.servCode.dateRange.min) return this.weekDays.length;
    // today is within the range (inclusive)
    return this.weekDays.filter((weekDay) => weekDay >= today).length;
  }
}
