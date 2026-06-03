import { combineReducers } from "redux";
import globalSettingsReducer from "@/app/globalSettings/_lib/globalSettingsSlice";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
import { assignmentPlanReducer } from "@/app/bizPlan/assignmentPlan/assignmentPlanSlice";
// import { paceReducer } from "@/app/bizPlan/pace/slices/paceSlice";
// import { employeePaceReducer } from "@/app/bizPlan/pace/employee/employeePaceSlice";
import companyReducer from "@/app/realGreen/company/companySlice";
import callAheadReducer from "@/app/realGreen/callAhead/callAheadSlice";
import discountReducer from "@/app/realGreen/discount/discountSlice";
import employeeReducer from "@/app/realGreen/employee/employeeSlice";
import flagReducer from "@/app/realGreen/flag/flagSlice";
import custFlagReducer from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import progServReducer from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import productReducer from "@/app/realGreen/product/_lib/slices/productSlice";
import unitConfigReducer from "@/app/realGreen/product/unitConfig/unitConfigSlice";

import priceTableReducer from "@/app/realGreen/priceTable/priceTableSlice";
import { serviceConditionReducer } from "@/app/realGreen/serviceCondition/_lib/serviceConditionSlice";

import taxCodeReducer from "@/app/realGreen/taxCode/taxCodeSlice";
import zipCodeReducer from "@/app/realGreen/zipCode/zipCodeSlice";
import { customerReducer } from "@/store/reducers/customerReducers";
import centralDocPropsReducer from "@/app/csv/_lib/centralDocPropsSlice";
import { conditionReducer } from "@/app/realGreen/conditionCode/conditionSlice";
import { appMethodReducer } from "@/app/appMethod/appMethodSlice";
import { equipmentReducer } from "@/app/equipment/equipmentSlice";
import { equipmentPackageReducer } from "@/app/equipment/equipmentPackage/equipmentPackageSlice";
import createAppMethodReducer from "@/app/appMethod/appMethodCreate/createAppMethodSlice";
import { loadoutStartReducer } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";
import { loadoutFinishReducer } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSlice";
import { loadoutReducer } from "@/app/loadout/loadoutSlice";
import assignmentReducer from "@/app/assignment/assignmentSlice";
import quickSendReducer from "@/app/quickSend/quickSendSlice";
import { storedTemplatesReducer } from "@/app/quickSend/storedTemplates/storedTemplatesSlice";
import prepayReducer from "@/app/realGreen/prepay/prepaySlice";
import { serviceEtaReducer } from "@/app/scheduling/eta/serviceEtaSlice";
import { urgentReducer } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentSlice";
import { paceCrawlerReducer } from "@/app/bizPlan/paceCrawler/paceCrawlerSlice";
import { loadoutReportReducer } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSlice";
import { inventoryReducer } from "@/app/inventory/inventorySlice";
import javelinReducer from "@/app/javelin/javelinSlice";
import depositReducer from "@/app/javelin/depositSlice";

const rootReducer = combineReducers({
  globalSettings: globalSettingsReducer,
  ui: uiReducer,
  appMethod: appMethodReducer,
  assignmentPlan: assignmentPlanReducer,
  assignment: assignmentReducer,
  // pace: paceReducer,
  // employeePace: employeePaceReducer,
  createAppMethod: createAppMethodReducer,
  auth: authReducer,
  callAhead: callAheadReducer,
  company: companyReducer,
  condition: conditionReducer,
  custFlag: custFlagReducer,
  discount: discountReducer,
  employee: employeeReducer,
  flag: flagReducer,
  inventory: inventoryReducer,
  loadout: loadoutReducer,
  loadoutStart: loadoutStartReducer,
  loadoutFinish: loadoutFinishReducer,
  priceTable: priceTableReducer,
  product: productReducer,
  unitConfig: unitConfigReducer,
  prepay: prepayReducer,
  progServ: progServReducer,
  serviceCondition: serviceConditionReducer,
  taxCode: taxCodeReducer,
  zipCode: zipCodeReducer,
  equipment: equipmentReducer,
  equipmentPackage: equipmentPackageReducer,
  customer: customerReducer,
  centralDocProps: centralDocPropsReducer,
  quickSend: quickSendReducer,
  serviceEta: serviceEtaReducer,
  storedTemplates: storedTemplatesReducer,
  urgent: urgentReducer,
  paceCrawler: paceCrawlerReducer,
  loadoutReport: loadoutReportReducer,
  javelin: javelinReducer,
  deposit: depositReducer,
});

export default rootReducer;
