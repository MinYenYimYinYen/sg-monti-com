import { statusArrayToStringRange } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";
import {
  CustomerSearchCriteria,
  CustomerSearchRaw,
} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch";

export function remapCustSearch(
  search: CustomerSearchCriteria,
): CustomerSearchRaw {
  const rgSearch: CustomerSearchRaw = { searchType: "customer" };
  if (search.custIds) rgSearch.customerID = search.custIds;
  if (search.zip) rgSearch.customerZip = search.zip;
  if (search.statuses)
    rgSearch.customerStatus = statusArrayToStringRange(search.statuses);
  if (search.size)
    rgSearch.customerSize = {
      minValue: search.size.min,
      maxValue: search.size.max,
    };
  return rgSearch;
}