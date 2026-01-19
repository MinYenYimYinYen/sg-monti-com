import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";
import callAheadReducer from "@/app/realGreen/callAhead/callAheadSlice";
import taxCodeReducer from "@/app/realGreen/taxCode/taxCodeSlice";
import zipCodeReducer from "@/app/realGreen/zipCode/zipCodeSlice";
import progServMetaReducer from "@/app/realGreen/progServMeta/progServMetaSlice";
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
  progServMeta: progServMetaReducer,
  product: productReducer,
  priceTable: priceTableReducer,
  flag: flagReducer,
  company: companyReducer,
});

export default rootReducer;
