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
import { combineCapabilities } from "@/permission/combineCapabilities";

const realGreenMetadata = combineCapabilities({
  key: "realGreenMetadata",
  name: "Real Green Metadata",
  description: "",
  features: [
    taxCodeCapabilities,
    zipCodeCapabilities,
    prepayCapabilities,
    discountCapabilities,
    companyCapabilities,
    conditionCodeCapabilities,
    callAheadCapabilities,
    rgAccountCapabilities,
    progServCapabilities,
    priceTableCapabilities,
    employeeCapabilities,
    productCapabilities,
    flagCapabilities,
  ],
});

const products = combineCapabilities({
  key: "realGreenProducts",
  name: "Real Green Products",
  description: "Real Green Products and supporting models that extend them",
  features: [appMethodCapabilities],
});

const realGreenCustomers = combineCapabilities({
  key: "realGreenCustomers",
  name: "Real Green Customers",
  description: "Customers, Programs, Services and related items",
  features: [
    customerCapabilities,
    serviceConditionCapabilities,
    custFlagCapabilities,
    flagRuleCapabilities,
  ],
});

const scheduling = combineCapabilities({
  key: "scheduling",
  name: "Scheduling",
  description: "Features related to routing",
  features: [
    assignmentCapabilities,
    assignmentGroupCapabilities,
    employeeAvailabilityCapabilities,
    holidayCapabilities,
    paceCapabilities,
    plannedTimeOffCapabilities,
    priorityServiceCapabilities,
    routeNoteCapabilities,
    schedulingCapabilities,
  ],
});

const accounting = combineCapabilities({
  key: "accounting",
  name: "Accounting",
  description: "Quickbooks transactions and reporting",
  features: [
    accountCapabilities,
    depositMappingCapabilities,
    quickbooksCapabilities,
    qboConnectionCapabilities,
    importCCTxnCapabilities,
    qboJournalEntryCapabilities,
    qboPurchaseCapabilities,
    javelinCapabilities,
    timeCardCapabilities,
    priceIncreaseCapabilities,
    inventoryCapabilities,
  ],
});

const customerContact = combineCapabilities({
  key: "customerContact",
  name: "Customer Interaction",
  description: "Letters, Emails, Calls, Call Logs",
  features: [
    callLogCapabilities,
    formTemplateCapabilities,
    knowledgeBaseCapabilities,
    quickbooksCapabilities,
    prepayLettersCapabilities,
    quickSendCapabilities,
  ],
});

const siteAdmin = combineCapabilities({
  key: "siteAdmin",
  name: "Site Admin",
  description: "Auth/Permissions/Global Settings",
  features: [
    authCapabilities,
    equipmentCapabilities,
    globalSettingsCapabilities,
    syncUtilsCapabilities,
    syncMetadataCapabilities,
    capabilityManagementCapabilities,
  ],
});
