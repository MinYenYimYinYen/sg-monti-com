import { combineReducers } from "redux";
import activeCustomerReducer from "@/app/realGreen/customer/slices/activeCustomersSlice";
import printedCustomerReducer from "@/app/realGreen/customer/slices/printedCustomersSlice";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
import lastSeasonProductionReducer from "@/app/realGreen/customer/slices/lastSeasonProductionSlice";
import csvReducer from "@/app/csv/_lib/csvSlice";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  printed: printedCustomerReducer,
  central: centralCustomerReducer,
  lastSeasonProduction: lastSeasonProductionReducer,
  csv: csvReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
