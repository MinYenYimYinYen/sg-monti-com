import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";
import callAheadReducer from "@/app/realGreen/callAhead/callAheadSlice";
import taxCodeReducer from "@/app/realGreen/taxCode/taxCodeSlice";
import zipCodeReducer from "@/app/realGreen/zipCode/zipCodeSlice";
import progCodeReducer from "@/app/realGreen/progCode/_lib/progCodeSlice";
import servCodeReducer from "@/app/realGreen/servCode/servCodeSlice";
import productReducer from "@/app/realGreen/product/productSlice";
import priceTableReducer from "@/app/realGreen/priceTable/priceTableSlice";
import flagReducer from "@/app/realGreen/flag/flagSlice";
import companyReducer from "@/app/realGreen/company/_lib/companySlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  employee: employeeReducer,
  callAhead: callAheadReducer,
  taxCode: taxCodeReducer,
  zipCode: zipCodeReducer,
  progCode: progCodeReducer,
  servCode: servCodeReducer,
  product: productReducer,
  priceTable: priceTableReducer,
  flag: flagReducer,
  company: companyReducer,
});

export default rootReducer;
