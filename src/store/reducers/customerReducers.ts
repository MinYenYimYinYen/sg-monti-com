import { combineReducers } from "redux";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
import csvReducer from "@/app/csv/_lib/csvSlice";
import {
  activeCustomerReducer,
  lastSeasonProductionReducer,
  printedCustomerReducer,
} from "@/app/realGreen/customer/slices/customerReducers";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  lastSeasonProduction: lastSeasonProductionReducer,
  printed: printedCustomerReducer,
  central: centralCustomerReducer,
  csv: csvReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
