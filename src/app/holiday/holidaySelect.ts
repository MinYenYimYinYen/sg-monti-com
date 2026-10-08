import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Holiday } from "@/app/holiday/holidayTypes";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";

const selectDocs = (state: AppState) => state.holiday.docs;

const selectAll = createSelector([selectDocs], (docs): Holiday[] => docs);

/**
 * Expands all holiday dateRanges into individual weekday date strings.
 * Used by the crawler to skip holiday dates for all employees.
 */
const selectHolidayDates = createSelector([selectDocs], (docs): Set<string> => {
  const result = new Set<string>();
  for (const holiday of docs) {
    let day = holiday.dateRange.min;
    while (day <= holiday.dateRange.max) {
      if (dateStrings.isWeekDay(day)) result.add(day);
      day = dateStrings.addDays(day, 1);
    }
  }
  return result;
});

/**
 * Expands weather-day holiday dateRanges into individual weekday date strings.
 * Used by reliabilitySelect and productivitySelect to exclude these dates
 * from completion % denominators and suspicious-zero-day detection.
 */
const selectWeatherDayDates = createSelector(
  [selectDocs],
  (docs): Set<string> => {
    const result = new Set<string>();
    for (const holiday of docs) {
      if (!holiday.isWeatherDay) continue;
      let day = holiday.dateRange.min;
      while (day <= holiday.dateRange.max) {
        if (dateStrings.isWeekDay(day)) result.add(day);
        day = dateStrings.addDays(day, 1);
      }
    }
    return result;
  },
);

const selectGetFutureHolidays = createSelector([selectDocs], (holidays) => {
  const getFutureHolidays = (mainDate: string) => {
    const futureHolidays = holidays.filter(
      (holiday) => holiday.dateRange.min > mainDate,
    );
    return futureHolidays;
  };
  return getFutureHolidays;
});

const selectGetFutureHolidayDayCount = createSelector(
  [selectGetFutureHolidays],
  (getFutureHolidays) => {
    const futureHolidayDayCount = (mainDate: string) => {
      const futureHolidays = getFutureHolidays(mainDate);
      const dateArrays = futureHolidays.map((holiday) => {
        const dates = dateRanges.countWeekdays(holiday.dateRange);
        return dates;
      })
      const totalDays = dateArrays.reduce((acc, curr) => acc + curr, 0);
      return totalDays;
    }
    return futureHolidayDayCount;
  },
);

export const holidaySelect = {
  all: selectAll,
  holidayDates: selectHolidayDates,
  weatherDayDates: selectWeatherDayDates,
  getFutureHolidays: selectGetFutureHolidays,
  getFutureHolidayDayCount: selectGetFutureHolidayDayCount,
};
