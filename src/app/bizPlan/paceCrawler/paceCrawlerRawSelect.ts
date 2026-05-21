// import { createSelector } from "@reduxjs/toolkit";
// import { deepSelect } from "@/app/realGreen/deepSelect";
// import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
// import { CSPOps } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
// import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
// import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
// import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
//
// // ---------------------------------------------------------------------------
// // Status sets
// // ---------------------------------------------------------------------------
//
// const PRINTED_STATUSES = getServiceStatuses(["printed"]);
// const ACTIVE_ASAP_STATUSES = getServiceStatuses(["active", "asap"]);
//
// // ---------------------------------------------------------------------------
// // Projection window helpers
// // ---------------------------------------------------------------------------
//
// type ProjectionWindow = {
//   projectionStartDate: string | null;
//   unfinishedDayCount: number;
// };
//
// // Returns the projection window start date and the number of weekdays in that window.
// // When printed services exist, the window starts the day after the latest printed schedDate.
// // Falls back to daysRemaining when no printed services exist.
// function computeProjectionWindow(
//   servCode: ServCodeDeep,
//   printedSchedDates: string[],
// ): ProjectionWindow {
//   const today = dateStrings.today();
//
//   if (
//     printedSchedDates.length > 0 &&
//     dateRanges.isValidDateRange(servCode.dateRange)
//   ) {
//     const latestPrintedSchedDate = [...printedSchedDates].sort().at(-1)!;
//     const startFrom = dateStrings.nextWeekdayAfter(latestPrintedSchedDate);
//     const projectionStartDate = startFrom;
//
//     if (startFrom <= servCode.dateRange.max) {
//       const remainingRange = { min: startFrom, max: servCode.dateRange.max };
//       const unfinishedDayCount = Math.max(
//         dateRanges.countWeekdays(remainingRange),
//         1,
//       );
//       return { projectionStartDate, unfinishedDayCount };
//     } else {
//       return { projectionStartDate, unfinishedDayCount: 1 };
//     }
//   }
//
//   // No printed services: projection starts from max(today, dateRange.min)
//   const projectionStartDate = dateRanges.isValidDateRange(servCode.dateRange)
//     ? today > servCode.dateRange.min
//       ? today
//       : servCode.dateRange.min
//     : null;
//
//   return {
//     projectionStartDate,
//     unfinishedDayCount: Math.max(servCode.x.daysRemaining, 1),
//   };
// }
//
// // ---------------------------------------------------------------------------
// // Selectors
// // ---------------------------------------------------------------------------
//
// type RawServCodePacePerDayEntry = {
//   servCode: ServCodeDeep;
//   activeAsapCSP: ReturnType<typeof CSPOps.sumAll>;
//   projectionStartDate: string | null;
// };
//
// /**
//  * Per-servCode map containing `activeAsapCSP` (active + asap unscheduled work pool)
//  * and `projectionStartDate`. This is the subset of rawPaceSelect needed by paceCrawler.
//  *
//  * Map<servCodeId, { servCode, activeAsapCSP, projectionStartDate }>
//  */
// const selectRawServCodePacesPerDayMap = createSelector(
//   [deepSelect.servCodes],
//   (servCodes): Map<string, RawServCodePacePerDayEntry> => {
//     const entries: RawServCodePacePerDayEntry[] = servCodes.map((servCode) => {
//       // Active + asap only (excludes printed) — the unscheduled work pool
//       const activeAsapCSP = CSPOps.sumAll(
//         servCode.services
//           .filter(
//             (s) =>
//               ACTIVE_ASAP_STATUSES.includes(s.status) &&
//               s.program.status === "9",
//           )
//           .map((s) => CSPOps.fromService(s)),
//       );
//
//       const printedSchedDates = servCode.services
//         .filter(
//           (s) =>
//             PRINTED_STATUSES.includes(s.status) && s.program.status === "9",
//         )
//         .map((s) => s.lastAssigned.schedDate)
//         .filter(Boolean);
//
//       const { projectionStartDate } = computeProjectionWindow(
//         servCode,
//         printedSchedDates,
//       );
//
//       return { servCode, activeAsapCSP, projectionStartDate };
//     });
//
//     return new Grouper(entries).toUniqueMap((e) => e.servCode.servCodeId);
//   },
// );
//
// // ---------------------------------------------------------------------------
// // Layer A — Urgent ServCodes
// // ---------------------------------------------------------------------------
//
// /**
//  * "Which servCodes are urgent (asap or overdue) and have active/asap services with price > 0?"
//  *
//  * = alwaysAsap servCodes, OR servCodes whose dateRange.max is in the past.
//  * Must have at least one active/asap service with service.price > 0.
//  *
//  * Used by UrgentServCodeCard in the Employee Card Plan panel.
//  */
// const selectUrgentServCodes = createSelector(
//   [deepSelect.servCodes],
//   (servCodes): ServCodeDeep[] => {
//     const today = dateStrings.today();
//     return servCodes.filter((servCode) => {
//       const isUrgent =
//         servCode.alwaysAsap ||
//         (dateRanges.isValidDateRange(servCode.dateRange) &&
//           today > servCode.dateRange.max);
//
//       if (!isUrgent) return false;
//
//       return servCode.services.some(
//         (s) =>
//           ACTIVE_ASAP_STATUSES.includes(s.status) &&
//           s.program.status === "9" &&
//           s.price > 0,
//       );
//     });
//   },
// );
//
// // ---------------------------------------------------------------------------
// // Export
// // ---------------------------------------------------------------------------
//
// export const paceCrawlerRawSelect = {
//   rawServCodePacesPerDayMap: selectRawServCodePacesPerDayMap,
//   urgentServCodes: selectUrgentServCodes,
// };
