import { combineReducers } from "redux";
import centralCustomerReducer from "@/app/realGreen/customer/slices/centralCustomerSlice";
import {
  activeCustomerReducer,
  byAssignmentReducer,
  fullSeasonServicesReducer,
  lastSeasonProductionReducer,
  multiSeasonProductionReducer,
  printedCustomerReducer,
  priorityServiceCustomerReducer,
  recentProductionReducer,
  singleCustomerReducer,
} from "@/app/realGreen/customer/slices/customerSlices";

export const customerReducer = combineReducers({
  active: activeCustomerReducer,
  byAssignment: byAssignmentReducer,
  fullSeasonServices: fullSeasonServicesReducer,
  lastSeasonProduction: lastSeasonProductionReducer,
  multiSeasonProduction: multiSeasonProductionReducer,
  printed: printedCustomerReducer,
  priorityService: priorityServiceCustomerReducer,
  recentProduction: recentProductionReducer,
  single: singleCustomerReducer,
  central: centralCustomerReducer,
});

export type CustomerState = ReturnType<typeof customerReducer>;
