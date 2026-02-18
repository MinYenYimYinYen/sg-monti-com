import { rgHttp } from "@/app/realGreen/_lib/api/rgHttp";
import {CustomerSearchRaw} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/types/CustSearch";
import { ProgramSearchRaw } from "../../customer/_lib/searchUtil/searchCriteria/types/ProgSearch";
import { CustFlagIdsSearch } from "@/app/realGreen/custFlag/api/route";
// import { CustFlagIdsSearch } from "@/realGreen/types/CustFlagIdsSearch";
// import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
// import { ProgramSearch } from "@/realGreen/types/ProgramSearch";
// import { SeasonSummaryReportPOST } from "@/realGreen/types/SeasonSummaryReport";
// import { ServiceSearch } from "@/realGreen/types/ServiceSearch";
// import { PriceIncreasePOST } from "@/realGreen/types/PriceIncrease";
// import { RawProgram } from "@/realGreen/types/Program";
// import { RawCustomer } from "@/realGreen/types/Customer";
// import { AddFlagToCustomersPOST } from "@/pages/api/rg/customer-flags-add.types";

export type RgApiPath =
  | { path: "/CallAhead"; method: "GET"; body?: undefined }
  | { path: `/CallLog/Customer/${string}`; method: "GET"; body?: undefined }
  | { path: "/Company"; method: "GET"; body?: undefined }
  | { path: `/Company/${string}`; method: "GET"; body?: undefined }
  | { path: "/ConditionCode"; method: "GET"; body?: undefined }
  // | {
  //     path: `/Customer?employeeId=${string}`;
  //     method: "PUT";
  //     body: string | RawCustomer;
  //   }
  | { path: `/Customer/${string}`; method: "GET"; body?: undefined }
  | { path: `/Customer/${string}/Flags`; method: "GET"; body?: undefined }
  | {
      path: "/Customer/Flag/IDs";
      method: "POST";
      body: CustFlagIdsSearch;
    }
  // | {
  //     path: "/Customer/Flags/Add";
  //     method: "POST";
  //     body: AddFlagToCustomersPOST;
  //   }
  | { path: "/DiscountCode"; method: "GET"; body?: undefined }
  | { path: "/Employee"; method: "GET"; body?: undefined }
  | { path: `/Employee/${string}`; method: "GET"; body?: undefined }
  | { path: "/Employee/Active/true"; method: "GET"; body?: undefined }
  | { path: "/Flag"; method: "GET"; body?: undefined }
  | { path: "/PriceTable"; method: "GET"; body?: undefined }
  | { path: `/PriceTable/${string}/Detailed`; method: "GET"; body?: undefined }
  | { path: "/Products"; method: "GET"; body?: undefined }
  // | { path: "/Program"; method: "PUT"; body: RawProgram }
  | { path: "/ProgramCode"; method: "GET"; body?: undefined }
  | { path: `/ProgramCode/${string}/Services`; method: "GET"; body?: undefined }
  | {
      path: `/Reporting/Sales/ByEmployee/Summary?DateRange=Custom&CustomDateRangeMinValue=${string}&CustomDateRangeMaxValue=${string}&IncludeSkippedServices=false`;
      method: "GET";
      body?: undefined;
    }
  // | {
  //     path: "/Reporting/SeasonSummary/Round";
  //     method: "POST";
  //     body?: SeasonSummaryReportPOST;
  //   }
  | { path: "/ServiceCode"; method: "GET"; body?: undefined }
  | {
      path: "/ServiceConditions/Search";
      method: "POST";
      body: { serviceIDs: number[] };
    }
  // | {
  //     path: "/Utilities/YearEnd/PriceIncrease";
  //     method: "POST";
  //     body: PriceIncreasePOST;
  //   }
  | { path: "/Tax"; method: "GET"; body?: undefined }
  | { path: "/ZipCode"; method: "GET"; body?: undefined };

//This should only be used from within a local api route.
export async function rgApi<T>(config: RgApiPath) {
  const { path, method, body } = config;

  return rgHttp<T>(path, {
    method,
    // Cast to 'any' allows passing the object payload.
    // The rgHttp wrapper will handle JSON.stringify automatically.
    body: body as any,
  });
}
