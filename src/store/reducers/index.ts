import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  employee: employeeReducer,
});

export default rootReducer;
