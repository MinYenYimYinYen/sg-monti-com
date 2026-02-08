import { TRange } from "@/lib/primatives/tRange/TRange";

export enum RecentFrame {
  Hour = "Hour",
  Day = "Day",
  Week = "Week",
  Month = "Month",
  Year = "Year",
}

function getRecentDateTimeRange(frame: RecentFrame): TRange<string> {
  let dateTimeRange: TRange<string> = { min: "", max: "" };
  switch (frame) {
    case "Hour": {
      const now = new Date();
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      dateTimeRange = {
        min: anHourAgo.toISOString(),
        max: now.toISOString(),
      };
      break;
    }
    case "Day": {
      const now = new Date();
      const aDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateTimeRange = {
        min: aDayAgo.toISOString(),
        max: now.toISOString(),
      };
      break;
    }
    case "Week": {
      const now = new Date();
      const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        min: aWeekAgo.toISOString(),
        max: now.toISOString(),
      };
      break;
    }
    case "Month": {
      const now = new Date();
      const aMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        min: aMonthAgo.toISOString(),
        max: now.toISOString(),
      };
      break;
    }
    case "Year": {
      const now = new Date();
      const aYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      dateTimeRange = {
        min: aYearAgo.toISOString(),
        max: now.toISOString(),
      };
      break;
    }
  }
  return dateTimeRange;
}

export const getDate = { getRecentDateTimeRange };
