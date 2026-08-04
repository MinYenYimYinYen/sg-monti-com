import { combineReducers } from "redux";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
import {
  activeCustomerReducer,
  byAssignmentReducer,
  lastSeasonProductionReducer,
  printedCustomerReducer,
  priorityServiceCustomerReducer,
  recentProductionReducer,
  singleCustomerReducer,
} from "@/app/realGreen/customer/slices/customerSlices";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  byAssignment: byAssignmentReducer,
  lastSeasonProduction: lastSeasonProductionReducer,
  printed: printedCustomerReducer,
  priorityService: priorityServiceCustomerReducer,
  recentProduction: recentProductionReducer,
  single: singleCustomerReducer,
  central: centralCustomerReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
