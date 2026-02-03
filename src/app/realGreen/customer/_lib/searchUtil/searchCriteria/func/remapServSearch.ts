import {
  ServiceSearchCriteria,
  ServiceSearchRaw,
} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch";
import { AppError } from "@/lib/errors/AppError";

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
  rgSearch.serviceYear = [search.season];
  return rgSearch;
}
