import { rgHttp } from "@/app/realGreen/_lib/api/rgHttp";
import { CustomerSearchRaw } from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch";
import { ProgramSearchRaw } from "../../customer/_lib/searchUtil/searchCriteria/types/ProgSearch";
import { CustFlagIdsSearch } from "@/app/realGreen/custFlag/api/route";

export type RgApiPath =
  | { path: "/CallAhead"; method: "GET"; body?: undefined; pathTemplate: "/CallAhead" }
  | { path: "/CallReason"; method: "GET"; body?: undefined; pathTemplate: "/CallReason" }
  | { path: `/CallLog/Customer/${string}`; method: "GET"; body?: undefined; pathTemplate: "/CallLog/Customer/{custId}" }
  | {
      path: "/CallLog/CallLogSearch";
      method: "POST";
      body: import("@/app/realGreen/callLog/_lib/CallLogSearch").CallLogSearchRaw;
      pathTemplate: "/CallLog/CallLogSearch";
    }
  | { path: "/Company"; method: "GET"; body?: undefined; pathTemplate: "/Company" }
  | { path: `/Company/${string}`; method: "GET"; body?: undefined; pathTemplate: "/Company/{companyId}" }
  | { path: "/ConditionCode"; method: "GET"; body?: undefined; pathTemplate: "/ConditionCode" }
  | { path: `/Customer/${string}`; method: "GET"; body?: undefined; pathTemplate: "/Customer/{custId}" }
  | { path: `/Customer/${string}/Flags`; method: "GET"; body?: undefined; pathTemplate: "/Customer/{custId}/Flags" }
  | {
      path: "/Customer/Flag/IDs";
      method: "POST";
      body: CustFlagIdsSearch;
      pathTemplate: "/Customer/Flag/IDs";
    }
  | {
      path: "/Customer/Flags/Add";
      method: "POST";
      body: { customerNumbers: number[]; flag: number };
      pathTemplate: "/Customer/Flags/Add";
    }
  | { path: "/DiscountCode"; method: "GET"; body?: undefined; pathTemplate: "/DiscountCode" }
  | { path: "/Employee"; method: "GET"; body?: undefined; pathTemplate: "/Employee" }
  | { path: `/Employee/${string}`; method: "GET"; body?: undefined; pathTemplate: "/Employee/{employeeId}" }
  | { path: "/Employee/Active/true"; method: "GET"; body?: undefined; pathTemplate: "/Employee/Active/true" }
  | { path: "/Flag"; method: "GET"; body?: undefined; pathTemplate: "/Flag" }
  | { path: "/PrepayCodes/Available/true"; method: "GET"; body?: undefined; pathTemplate: "/PrepayCodes/Available/true" }
  | { path: "/PriceTable"; method: "GET"; body?: undefined; pathTemplate: "/PriceTable" }
  | { path: `/PriceTable/${string}/Detailed`; method: "GET"; body?: undefined; pathTemplate: "/PriceTable/{tableId}/Detailed" }
  | { path: "/Products"; method: "GET"; body?: undefined; pathTemplate: "/Products" }
  | { path: "/ProgramCode"; method: "GET"; body?: undefined; pathTemplate: "/ProgramCode" }
  | { path: `/ProgramCode/${string}/Services`; method: "GET"; body?: undefined; pathTemplate: "/ProgramCode/{id}/Services" }
  | {
      path: `/Reporting/Sales/ByEmployee/Summary?DateRange=Custom&CustomDateRangeMinValue=${string}&CustomDateRangeMaxValue=${string}&IncludeSkippedServices=false`;
      method: "GET";
      body?: undefined;
      pathTemplate: "/Reporting/Sales/ByEmployee/Summary";
    }
  | { path: "/ServiceCode"; method: "GET"; body?: undefined; pathTemplate: "/ServiceCode" }
  | {
      path: "/ServiceConditions/Search";
      method: "POST";
      body: { serviceIDs: number[] };
      pathTemplate: "/ServiceConditions/Search";
    }
  | { path: "/Tax"; method: "GET"; body?: undefined; pathTemplate: "/Tax" }
  | { path: "/ZipCode"; method: "GET"; body?: undefined; pathTemplate: "/ZipCode" };

//This should only be used from within a local api route.
export async function rgApi<T>(config: RgApiPath) {
  const { path, method, body, pathTemplate } = config;

  return rgHttp<T>(
    path,
    {
      method,
      // Cast to 'any' allows passing the object payload.
      // The rgHttp wrapper will handle JSON.stringify automatically.
      body: body as any,
    },
    pathTemplate,
  );
}
