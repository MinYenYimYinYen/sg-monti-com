import { SuccessResponse } from "@/lib/api/types/responses";
import { CustSearch } from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";
import { ServSearch } from "@/app/realGreen/customer/_lib/searchTypes/ServSearch";
import { ProgSearch } from "@/app/realGreen/customer/_lib/searchTypes/ProgSearch";
import { ServiceWithMongo } from "@/app/realGreen/customer/_lib/types/Service";
import { ProgramWithMongo } from "@/app/realGreen/customer/_lib/types/Program";
import { CustomerWithMongo } from "@/app/realGreen/customer/_lib/types/Customer";

export interface ApiContract<TParams = any> {
  [key: string]: {
    params: TParams;
    result: SuccessResponse;
  };
}

//todo: Standardize all the Contracts in the project to extend ApiContract
// Add this to api.readme.md

export interface SearchScheme<
  TParams = CustSearch | ProgSearch | ServSearch,
  TResult = CustomerWithMongo | ServiceWithMongo | ProgramWithMongo,
  TNextParams = CustSearch | ProgSearch | ServSearch,
> {
  [key: string]: {
    params: TParams;
    result: TResult;
    toDependency: ((result: TResult) => TNextParams)
  };
}
