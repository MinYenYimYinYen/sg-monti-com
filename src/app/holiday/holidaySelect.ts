import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Holiday } from "@/app/holiday/holidayTypes";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

const selectDocs = (state: AppState) => state.holiday.docs;

const selectAll = createSelector([selectDocs], (docs): Holiday[] => docs);

/**
 * Expands all holiday dateRanges into individual weekday date strings.
 * Used by the crawler to skip holiday dates for all employees.
 */
const selectHolidayDates = createSelector(
  [selectDocs],
  (docs): Set<string> => {
    const result = new Set<string>();
    for (const holiday of docs) {
      let day = holiday.dateRange.min;
      while (day <= holiday.dateRange.max) {
        if (dateStrings.isWeekDay(day)) result.add(day);
        day = dateStrings.addDays(day, 1);
      }
    }
    return result;
  },
);

export const holidaySelect = {
  all: selectAll,
  holidayDates: selectHolidayDates,
};
