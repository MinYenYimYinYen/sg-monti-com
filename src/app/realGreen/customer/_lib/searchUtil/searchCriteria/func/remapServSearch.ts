import {
  ServiceSearchCriteria,
  ServiceSearchRaw,
} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch";
import { AppError } from "@/lib/errors/AppError";
import { TRange } from "@/lib/primatives/tRange/TRange";

function tRangeToArray(range: TRange<number>): number[] {
  const { min, max } = range;
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error(
      `Invalid range: min (${min}) and max (${max}) must be integers.`,
    );
  }
  if (min > max) {
    return [];
  }
  const result: number[] = [];
  for (let i = min; i <= max; i++) {
    result.push(i);
  }

  return result;
}

export function remapServSearch(
  search: ServiceSearchCriteria,
): ServiceSearchRaw {
  if (!search.season) {
    throw new AppError({
      message: "No season provided for service search",
      type: "VALIDATION_ERROR",
    });
  }
  const rgSearch: ServiceSearchRaw = { searchType: "service" };
  if (search.custIds) rgSearch.customerNumber = search.custIds;
  if (search.servIds) rgSearch.id = search.servIds;
  if (search.progIds) rgSearch.programID = search.progIds;
  if (search.servStats) rgSearch.serviceStatus = search.servStats;
  rgSearch.serviceYear = tRangeToArray(search.season);
  return rgSearch;
}
