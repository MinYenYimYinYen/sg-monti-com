import { rgHttp } from "@/app/realGreen/employee/api/rgHttp";
import { SearchCriteriaRaw } from "@/app/realGreen/customer/_lib/types/searchScheme/SearchScheme";

export async function rgSearch<T>(criteria: SearchCriteriaRaw) {
  let path: string;

  switch (criteria.searchType) {
    case "customer":
      path = "/Customer/Search";
      break;
    case "program":
      path = "/Program/Search";
      break;
    case "service":
      path = "/Service/Search";
      break;
    default:
      throw new Error(`Unknown search type: ${(criteria as any).searchType}`);
  }

  // We strip 'searchType' before sending to the API
  const { searchType, ...body } = criteria;

  return rgHttp<T>(path, {
    method: "POST",
    body: body as any,
  });
}
