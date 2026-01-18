import { DateTimeRange } from "@/realGreen/types/DateTimeRange";

export enum RecentFrame {
  Hour = "Hour",
  Day = "Day",
  Week = "Week",
  Month = "Month",
  Year = "Year",
}

function getRecentDateTimeRange(frame: RecentFrame): DateTimeRange {
  let dateTimeRange: DateTimeRange = { minValue: "", maxValue: "" };
  switch (frame) {
    case "Hour": {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      dateTimeRange = {
        minValue: anHourAgo.toISOString(),
        maxValue: now.toISOString(),
      };
      break;
    }
    case "Day": {
      const now = new Date();
      const aDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateTimeRange = {
        minValue: aDayAgo.toISOString(),
        maxValue: now.toISOString(),
      };
      break;
    }
    case "Week": {
      const now = new Date();
      const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        minValue: aWeekAgo.toISOString(),
        maxValue: now.toISOString(),
      };
      break;
    }
    case "Month": {
      const now = new Date();
      const aMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        minValue: aMonthAgo.toISOString(),
        maxValue: now.toISOString(),
      };
      break;
    }
    case "Year": {
      const now = new Date();
      const aYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        minValue: aYearAgo.toISOString(),
        maxValue: now.toISOString(),
      };
      break;
    }
  }
  return dateTimeRange;
}

export const getDate = { getRecentDateTimeRange };
