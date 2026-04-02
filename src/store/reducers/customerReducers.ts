import { combineReducers } from "redux";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
import csvReducer from "@/app/csv/_lib/csvSlice";
import {
  activeCustomerReducer,
  lastSeasonProductionReducer,
  printedCustomerReducer, singleCustomerReducer,
} from "@/app/realGreen/customer/slices/customerSlices";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  lastSeasonProduction: lastSeasonProductionReducer,
  printed: printedCustomerReducer,
  recentProduction: printedCustomerReducer,
  single: singleCustomerReducer,
  central: centralCustomerReducer,
  csv: csvReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
