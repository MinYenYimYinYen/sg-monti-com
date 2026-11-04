import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { QboVendor, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { sortVendorsByName, summarizeVendor } from "@/app/qbo/vendor/_lib/qboVendorUtils";

// Server only. Read-only. The where clause matters: a bare query may return active records
// only, and inactive vendors must stay visible so a mapping that points at one can be flagged.
// Each vendor is cut down before it leaves the server (see qboVendorUtils).
export async function loadQboVendors(): Promise<QboVendorSummary[]> {
  const vendors = await qboQueryAll<QboVendor>({
    entity: "Vendor",
    where: "Active IN (true, false)",
  });
  return sortVendorsByName(vendors.map(summarizeVendor));
}
