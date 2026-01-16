import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  employee: employeeReducer,
});

export default rootReducer;
