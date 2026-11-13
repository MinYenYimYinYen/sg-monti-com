import {
  buildRegistry,
  RegisteredCapability,
} from "@/permission/buildRegistry";
import { combineCapabilities } from "@/permission/combineCapabilities";
import { capabilityManagementCapabilities } from "@/app/permission/capabilityManagementCapabilities";
import { accountCapabilities } from "@/app/account/accountCapabilities";
import { depositMappingCapabilities } from "@/app/javelin/depositMapping/depositMappingCapabilities";
import { quickbooksCapabilities } from "@/app/qbo/quickbooksCapabilities";
import { qboConnectionCapabilities } from "@/app/qbo/connection/qboConnectionCapabilities";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { qboJournalEntryCapabilities } from "@/app/qbo/journalEntry/qboJournalEntryCapabilities";
import { qboPurchaseCapabilities } from "@/app/qbo/purchase/qboPurchaseCapabilities";
import { appMethodCapabilities } from "@/app/appMethod/appMethodCapabilities";
import { assignmentCapabilities } from "@/app/assignment/assignmentCapabilities";
import { assignmentGroupCapabilities } from "@/app/assignmentGroup/assignmentGroupCapabilities";
import { authCapabilities } from "@/app/auth/authCapabilities";
import { employeeAvailabilityCapabilities } from "@/app/employeeAvailability/employeeAvailabilityCapabilities";
import { equipmentCapabilities } from "@/app/equipment/equipmentCapabilities";
import { flagRuleCapabilities } from "@/app/flagRule/flagRuleCapabilities";
import { formTemplateCapabilities } from "@/app/formTemplate/formTemplateCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";
import { holidayCapabilities } from "@/app/holiday/holidayCapabilities";
import { inventoryCapabilities } from "@/app/inventory/inventoryCapabilities";
import { javelinCapabilities } from "@/app/javelin/javelinCapabilities";
import { knowledgeBaseCapabilities } from "@/app/knowledgeBase/knowledgeBaseCapabilities";
import { paceCapabilities } from "@/app/pace/paceCapabilities";
import { plannedTimeOffCapabilities } from "@/app/plannedTimeOff/plannedTimeOffCapabilities";
import { prepayLettersCapabilities } from "@/app/prepayLetters/prepayLettersCapabilities";
import { priceIncreaseCapabilities } from "@/app/priceIncrease/priceIncreaseCapabilities";
import { priorityServiceCapabilities } from "@/app/priorityService/priorityServiceCapabilities";
import { quickSendCapabilities } from "@/app/quickSend/quickSendCapabilities";
import { callAheadCapabilities } from "@/app/realGreen/callAhead/callAheadCapabilities";
import { callLogCapabilities } from "@/app/realGreen/callLog/callLogCapabilities";
import { companyCapabilities } from "@/app/realGreen/company/companyCapabilities";
import { conditionCodeCapabilities } from "@/app/realGreen/conditionCode/conditionCodeCapabilities";
import { custFlagCapabilities } from "@/app/realGreen/custFlag/custFlagCapabilities";
import { customerCapabilities } from "@/app/realGreen/customer/customerCapabilities";
import { discountCapabilities } from "@/app/realGreen/discount/discountCapabilities";
import { employeeCapabilities } from "@/app/realGreen/employee/employeeCapabilities";
import { flagCapabilities } from "@/app/realGreen/flag/flagCapabilities";
import { prepayCapabilities } from "@/app/realGreen/prepay/prepayCapabilities";
import { priceTableCapabilities } from "@/app/realGreen/priceTable/priceTableCapabilities";
import { productCapabilities } from "@/app/realGreen/product/productCapabilities";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";
import { rgAccountCapabilities } from "@/app/realGreen/rgAccount/rgAccountCapabilities";
import { serviceConditionCapabilities } from "@/app/realGreen/serviceCondition/serviceConditionCapabilities";
import { syncMetadataCapabilities } from "@/app/realGreen/syncMetadata/syncMetadataCapabilities";
import { taxCodeCapabilities } from "@/app/realGreen/taxCode/taxCodeCapabilities";
import { zipCodeCapabilities } from "@/app/realGreen/zipCode/zipCodeCapabilities";
import { routeNoteCapabilities } from "@/app/routeNotes/routeNoteCapabilities";
import { schedulingCapabilities } from "@/app/scheduling/schedulingCapabilities";
import { syncUtilsCapabilities } from "@/app/syncUtils/syncUtilsCapabilities";
import { timeCardCapabilities } from "@/app/timeCard/timeCardCapabilities";

// Groups: what the admin screens list. A group is combineCapabilities over feature declarations,
// with a human name and a description of what assigning it means. It changes nothing about
// enforcement: each capability keeps the string its own feature declared, and routes and
// components keep importing that feature's `can` constants. A feature a group includes must not
// also be listed in `registeredFeatures` below (the registry rejects the duplicate strings).
//
// To group features: write a group here, then replace the features it includes in
// `registeredFeatures` with the group. A feature left in the list on its own still appears, as a
// group of one.
export const realGreenTaxAndZipCapabilities = combineCapabilities({
  key: "realGreenTaxAndZip",
  name: "RealGreen tax and zip codes",
  description:
    "Lets a user read RealGreen's tax codes and zip codes. Zip codes only carry tax code ids, so the two are assigned together.",
  features: [taxCodeCapabilities, zipCodeCapabilities],
});

// The one place that lists every feature's capabilities, the way combineReducers lists slices.
// To register a feature, import the result of its createFeatureCapabilities (kept beside the
// feature in <feature>Capabilities.ts) and add it here. The drift test fails if a declaration
// file exists that is not listed.
//
// Only the admin UI, the capability loaders and tests import this file. A handler or component
// imports just its own feature's `can` constants.
//
// Starts with the permission module's own feature. Other features are added as they declare
// capabilities (nothing blocks on that: every module that takes a registry is tested against
// test-local ones).
export const registeredFeatures = [
  capabilityManagementCapabilities,
  accountCapabilities,
  depositMappingCapabilities,
  quickbooksCapabilities,
  qboConnectionCapabilities,
  importCCTxnCapabilities,
  qboJournalEntryCapabilities,
  qboPurchaseCapabilities,
  appMethodCapabilities,
  assignmentCapabilities,
  assignmentGroupCapabilities,
  authCapabilities,
  employeeAvailabilityCapabilities,
  equipmentCapabilities,
  flagRuleCapabilities,
  formTemplateCapabilities,
  globalSettingsCapabilities,
  holidayCapabilities,
  inventoryCapabilities,
  javelinCapabilities,
  knowledgeBaseCapabilities,
  paceCapabilities,
  plannedTimeOffCapabilities,
  prepayLettersCapabilities,
  priceIncreaseCapabilities,
  priorityServiceCapabilities,
  quickSendCapabilities,
  callAheadCapabilities,
  callLogCapabilities,
  companyCapabilities,
  conditionCodeCapabilities,
  custFlagCapabilities,
  customerCapabilities,
  discountCapabilities,
  employeeCapabilities,
  flagCapabilities,
  prepayCapabilities,
  priceTableCapabilities,
  productCapabilities,
  progServCapabilities,
  rgAccountCapabilities,
  serviceConditionCapabilities,
  syncMetadataCapabilities,
  realGreenTaxAndZipCapabilities,
  routeNoteCapabilities,
  schedulingCapabilities,
  syncUtilsCapabilities,
  timeCardCapabilities,
] as const;

export type RegisteredCapabilityString = RegisteredCapability<
  typeof registeredFeatures
>;

export const capabilityRegistry = buildRegistry(registeredFeatures);
