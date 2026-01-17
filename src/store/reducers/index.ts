import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";
import callAheadReducer from "@/app/realGreen/callAhead/callAheadSlice";
import taxCodeReducer from "@/app/realGreen/taxCode/taxCodeSlice";
import zipCodeReducer from "@/app/realGreen/zipCode/zipCodeSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  employee: employeeReducer,
  callAhead: callAheadReducer,
  taxCode: taxCodeReducer,
  zipCode: zipCodeReducer,
});

export default rootReducer;
