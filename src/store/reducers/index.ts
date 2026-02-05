import { combineReducers } from "redux";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import companyReducer from "@/app/realGreen/company/companySlice";
import callAheadReducer from "@/app/realGreen/callAhead/callAheadSlice";
import discountReducer from "@/app/realGreen/discount/discountSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";
import flagReducer from "@/app/realGreen/flag/flagSlice";
import progServReducer from "@/app/realGreen/progServ/progServSlice";
import productReducer from "@/app/realGreen/product/_lib/slices/productSlice";
import priceTableReducer from "@/app/realGreen/priceTable/priceTableSlice";
import taxCodeReducer from "@/app/realGreen/taxCode/taxCodeSlice";
import zipCodeReducer from "@/app/realGreen/zipCode/zipCodeSlice";
import { customerReducer } from "@/store/reducers/customerReducers";

const rootReducer = combineReducers({
  ui: uiReducer,
  auth: authReducer,
  callAhead: callAheadReducer,
  company: companyReducer,
  discount: discountReducer,
  employee: employeeReducer,
  flag: flagReducer,
  priceTable: priceTableReducer,
  product: productReducer,
  progServ: progServReducer,
  taxCode: taxCodeReducer,
  zipCode: zipCodeReducer,
  customer: customerReducer,
});

export default rootReducer;
