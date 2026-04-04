import { combineReducers } from "redux";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
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
});

export type CustomerState = ReturnType<typeof customerReducer>;
