import {
  ServiceSearchCriteria,
  ServiceSearchRaw,
} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ServSearch";

export function remapServSearch(
  search: ServiceSearchCriteria,
): ServiceSearchRaw {
  const rgSearch: ServiceSearchRaw = { searchType: "service" };
  if (search.custIds) rgSearch.customerNumber = search.custIds;
  if (search.servIds) rgSearch.id = search.servIds;
  if (search.progIds) rgSearch.programID = search.progIds;
  if (search.servStats) rgSearch.serviceStatus = search.servStats;
  rgSearch.serviceYear = [search.season];
  return rgSearch;
}