import { combineReducers } from "redux";
import activeCustomerReducer from "@/app/realGreen/customer/slices/activeCustomersSlice";
import printedCustomerReducer from "@/app/realGreen/customer/slices/printedCustomersSlice";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  printed: printedCustomerReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
