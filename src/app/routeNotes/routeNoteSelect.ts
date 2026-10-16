import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectDocs = (state: AppState) => state.routeNotes.docs;

const selectAll = createSelector([selectDocs], (docs): RouteNote[] => docs);

/**
 * Map<schedDate, Map<employeeId | "__day__", RouteNote[]>>
 *
 * Day-level notes (employeeId === null) are keyed under "__day__".
 * Employee notes are keyed under their employeeId.
 */
const selectByDateAndEmployee = createSelector(
  [selectDocs],
  (docs): Map<string, Map<string, RouteNote[]>> => {
    const result = new Map<string, Map<string, RouteNote[]>>();
    for (const note of docs) {
      const key = note.employeeId ?? "__day__";
      if (!result.has(note.schedDate)) result.set(note.schedDate, new Map());
      const byEmployee = result.get(note.schedDate)!;
      if (!byEmployee.has(key)) byEmployee.set(key, []);
      byEmployee.get(key)!.push(note);
    }
    return result;
  },
);

/**
 * Map<schedDate, RouteNote[]> — all notes for each date that should appear
 * in the crew lead clipboard summary (showInCrewLeadSummary === true).
 */
const selectCrewLeadSummaryByDate = createSelector(
  [selectDocs],
  (docs): Map<string, RouteNote[]> =>
    new Grouper(docs.filter((d) => d.showInCrewLeadSummary))
      .groupBy((d) => d.schedDate)
      .toMap(),
);

/** Set of schedDates that have at least one note. */
const selectDatesWithNotes = createSelector(
  [selectDocs],
  (docs): Set<string> => new Set(docs.map((d) => d.schedDate)),
);

export const routeNoteSelect = {
  all: selectAll,
  byDateAndEmployee: selectByDateAndEmployee,
  crewLeadSummaryByDate: selectCrewLeadSummaryByDate,
  datesWithNotes: selectDatesWithNotes,
};
