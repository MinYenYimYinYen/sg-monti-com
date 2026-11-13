import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { depositMappingCapabilities } from "@/app/javelin/depositMapping/depositMappingCapabilities";
import { quickbooksCapabilities } from "@/app/qbo/quickbooksCapabilities";
import { rgAccountCapabilities } from "@/app/realGreen/rgAccount/rgAccountCapabilities";

// accountMappings.read   -> account getAll
// accountMappings.write  -> account upsert
// accountMappings.delete -> account remove
//
// requires: the account mapping page also loads and shows the deposit account links, the
// QuickBooks accounts it links to, and the customers and vendors offered as an account's default
// name, and the RealGreen accounts it lists to link. Those are other features' data with their own
// capabilities, so reading the page needs reading them.
export const accountCapabilities = createFeatureCapabilities({
  key: "account",
  resources: {
    accountMappings: {
      shape: "collection",
      verbs: ["read", "write", "delete"],
    },
  },
  requires: {
    "accountMappings.read": [
      depositMappingCapabilities.can.depositFieldLinks.read,
      quickbooksCapabilities.can.accounts.read,
      quickbooksCapabilities.can.customers.read,
      quickbooksCapabilities.can.vendors.read,
      rgAccountCapabilities.can.rgAccounts.read,
    ],
  },
});