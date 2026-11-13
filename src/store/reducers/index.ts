import { combineReducers } from "redux";
import globalSettingsReducer from "@/app/globalSettings/_lib/globalSettingsSlice";
import uiReducer from "@/store/reduxUtil/uiSlice";
import authReducer from "@/app/auth/authSlice";
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
import rgAccountReducer from "@/app/realGreen/rgAccount/rgAccountSlice";
import { accountMappingReducer } from "@/app/account/accountMappingSlice";
import { depositFieldMappingReducer } from "@/app/javelin/depositMapping/depositFieldMappingSlice";
import { customerReducer } from "@/store/reducers/customerReducers";
import centralDocPropsReducer from "@/app/csv/_lib/centralDocPropsSlice";
import { conditionReducer } from "@/app/realGreen/conditionCode/conditionSlice";
import { callLogReducer } from "@/app/realGreen/callLog/callLogSlice";
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
import { loadoutReportReducer } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSlice";
import { inventoryReducer } from "@/app/inventory/inventorySlice";
import javelinReducer from "@/app/javelin/javelinSlice";
import depositReducer from "@/app/javelin/depositSlice";
import ckDepositReducer from "@/app/javelin/ckDepositSlice";
import { priorityServiceReducer } from "@/app/priorityService/priorityServiceSlice";
import { plannedTimeOffReducer } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { holidayReducer } from "@/app/holiday/holidaySlice";
import { timeCardReducer } from "@/app/timeCard/timeCardSlice";
import { timeCardImportReducer } from "@/app/timeCard/import/timeCardImportSlice";
import { timeCardPayrollReducer } from "@/app/timeCard/payroll/timeCardPayrollSlice";
import { customerValueFilterReducer } from "@/app/bizPlan/customerValue/customerValueFilterSlice";
import { productivityReducer } from "@/app/productivity/productivitySlice";
import { flagRuleReducer } from "@/app/flagRule/flagRuleSlice";
import { employeeAvailabilityReducer } from "@/app/employeeAvailability/employeeAvailabilitySlice";
import { sanityReducer } from "@/app/sanity/sanitySlice";
import seasonIncreasesReducer from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";
import priceIncreaseSettingsReducer from "@/app/priceIncrease/settings/settingsSlice";
import priceIncreaseConfigReducer from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";
import { topicReducer } from "@/app/knowledgeBase/topicSlice";
import capabilityBundleReducer from "@/app/permission/capabilityBundle/capabilityBundleSlice";
import userCapabilitiesReducer from "@/app/permission/userCapabilities/userCapabilitiesSlice";
import { corruptedSyncRecordReducer } from "@/app/realGreen/customer/sync/corruptedRecords/corruptedSyncRecordSlice";
import { prepayConfigReducer } from "@/app/prepayLetters/config/prepayConfigSlice";
import { upsellPrioritiesReducer } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesSlice";
import { paceReducer } from "@/app/pace/paceSlice";
import { paceAssignmentGroupReducer } from "@/app/pace/assignmentGroup/assignmentGroupSlice";
import { paceGroupSequenceReducer } from "@/app/pace/groupSequence/groupSequenceSlice";
import { paceAssignmentPlanReducer } from "@/app/pace/assignmentPlan/assignmentPlanSlice";
import { paceSeasonPlanReducer } from "@/app/pace/seasonPlan/seasonPlanSlice";
import { burndownReducer } from "@/app/pace/burndown/burndownSlice";
import { formTemplateReducer } from "@/app/formTemplate/formTemplateSlice";
import { renewalLettersReducer } from "@/app/prepayLetters/renewalLetters/renewalLettersSlice";
import { routeNoteReducer } from "@/app/routeNotes/routeNoteSlice";
import { urgentReducer } from "@/app/pace/priorities/urgentSlice";
import { qboConnectionReducer } from "@/app/qbo/connection/qboConnectionSlice";
import { qboAccountReducer } from "@/app/qbo/account/qboAccountSlice";
import { qboVendorReducer } from "@/app/qbo/vendor/qboVendorSlice";
import { qboCustomerReducer } from "@/app/qbo/customer/qboCustomerSlice";
import { qboEmployeeReducer } from "@/app/qbo/employee/qboEmployeeSlice";
import { qboPurchaseReducer } from "@/app/qbo/purchase/qboPurchaseSlice";
import { qboJournalEntryReducer } from "@/app/qbo/journalEntry/qboJournalEntrySlice";
import { importCCTxnMappingReducer } from "@/app/qbo/importCCTxn/importCCTxnMappingSlice";
import { importRowReducer } from "@/app/qbo/importCCTxn/rows/importRowSlice";
import { importPostReducer } from "@/app/qbo/importCCTxn/post/importPostSlice";
import { importDecisionReducer } from "@/app/qbo/importCCTxn/decisions/importDecisionSlice";

const rootReducer = combineReducers({
  globalSettings: globalSettingsReducer,
  ui: uiReducer,
  appMethod: appMethodReducer,
  assignment: assignmentReducer,
  // pace: paceReducer, // old commented-out entry — now registered below as the new pace module
  // employeePace: employeePaceReducer,
  createAppMethod: createAppMethodReducer,
  auth: authReducer,
  callAhead: callAheadReducer,
  company: companyReducer,
  callLog: callLogReducer,
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
  rgAccount: rgAccountReducer,
  accountMapping: accountMappingReducer,
  depositFieldMapping: depositFieldMappingReducer,
  equipment: equipmentReducer,
  equipmentPackage: equipmentPackageReducer,
  customer: customerReducer,
  centralDocProps: centralDocPropsReducer,
  quickSend: quickSendReducer,
  serviceEta: serviceEtaReducer,
  storedTemplates: storedTemplatesReducer,
  loadoutReport: loadoutReportReducer,
  javelin: javelinReducer,
  deposit: depositReducer,
  ckDeposit: ckDepositReducer,
  priorityService: priorityServiceReducer,
  plannedTimeOff: plannedTimeOffReducer,
  holiday: holidayReducer,
  timeCard: timeCardReducer,
  timeCardImport: timeCardImportReducer,
  timeCardPayroll: timeCardPayrollReducer,
  customerValueFilter: customerValueFilterReducer,
  productivity: productivityReducer,
  flagRule: flagRuleReducer,
  employeeAvailability: employeeAvailabilityReducer,
  sanity: sanityReducer,
  seasonIncreases: seasonIncreasesReducer,
  priceIncreaseSettings: priceIncreaseSettingsReducer,
  priceIncreaseConfig: priceIncreaseConfigReducer,
  corruptedSyncRecord: corruptedSyncRecordReducer,
  prepayConfig: prepayConfigReducer,
  upsellPriorities: upsellPrioritiesReducer,
  pace: paceReducer,
  paceAssignmentGroup: paceAssignmentGroupReducer,
  paceGroupSequence: paceGroupSequenceReducer,
  paceAssignmentPlan: paceAssignmentPlanReducer,
  paceSeasonPlan: paceSeasonPlanReducer,
  burndown: burndownReducer,
  formTemplate: formTemplateReducer,
  renewalLetters: renewalLettersReducer,
  routeNotes: routeNoteReducer,
  paceUrgent: urgentReducer,
  qboConnection: qboConnectionReducer,
  qboAccount: qboAccountReducer,
  qboVendor: qboVendorReducer,
  qboCustomer: qboCustomerReducer,
  qboEmployee: qboEmployeeReducer,
  qboPurchase: qboPurchaseReducer,
  qboJournalEntry: qboJournalEntryReducer,
  importCCTxnMapping: importCCTxnMappingReducer,
  importRow: importRowReducer,
  importPost: importPostReducer,
  importDecision: importDecisionReducer,
  topic: topicReducer,
  capabilityBundle: capabilityBundleReducer,
  userCapabilities: userCapabilitiesReducer,
});

export default rootReducer;
