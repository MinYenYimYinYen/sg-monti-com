import { combineReducers } from "redux";
import activeCustomerReducer from "@/app/realGreen/customer/slices/activeCustomersSlice";
import printedCustomerReducer from "@/app/realGreen/customer/slices/printedCustomersSlice";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  printed: printedCustomerReducer,
  central: centralCustomerReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
