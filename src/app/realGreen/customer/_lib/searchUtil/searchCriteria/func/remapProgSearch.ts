import {
  ProgramSearchCriteria,
  ProgramSearchRaw,
} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/ProgSearch";

export function remapProgSearch(
  search: ProgramSearchCriteria,
): ProgramSearchRaw {
  const rgSearch: ProgramSearchRaw = { searchType: "program" };
  if (search.custIds) rgSearch.customerNumber = search.custIds;
  if (search.soldRange)
    rgSearch.dateSold = {
      minValue: search.soldRange.min,
      maxValue: search.soldRange.max,
    };
  if (search.progIds) rgSearch.id = search.progIds;
  if (search.season)
    rgSearch.serviceYear = {
      minValue: search.season.min,
      maxValue: search.season.max,
    };
  return rgSearch;
}
