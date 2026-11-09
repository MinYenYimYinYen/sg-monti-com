import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import {
  QboVendor,
  QboVendorCreate,
  QboVendorCreateResult,
  QboVendorSummary,
} from "@/app/qbo/vendor/types/QboVendorTypes";
import { loadQboVendors } from "@/app/qbo/vendor/_lib/qboVendorServer";
import { findFreshCustomerOrEmployeeName } from "@/app/qbo/_lib/qboNameServer";
import { describeUsedNameEntity } from "@/app/qbo/_lib/qboNameUtils";
import {
  classifyVendorCreateFailure,
  findVendorByName,
  normalizeVendorName,
  readFaultCodes,
  summarizeVendor,
  validateVendorName,
} from "@/app/qbo/vendor/_lib/qboVendorUtils";

// Server only. The ONLY code that creates a vendor in QuickBooks (POST /vendor). Admin only (see
// the route). Only DisplayName is sent: Intuit's page documents no default expense account.
//
// DisplayName is unique, so a repeated create cannot make a second vendor. That is what makes it
// safe to settle an uncertain outcome by reading the vendors again: qboHttp never resends a POST.

/** Always a fresh read, never the browser's session copy. */
async function findFreshVendor(name: string): Promise<QboVendorSummary | null> {
  return findVendorByName({ vendors: await loadQboVendors(), displayName: name });
}

function describeExisting(vendor: QboVendorSummary): QboVendorCreateResult {
  if (vendor.Active) return { status: "exists", vendor };
  return {
    status: "unavailable",
    message: `"${vendor.DisplayName}" exists in QuickBooks but is inactive. Reactivate it in QuickBooks, then reload the vendors. This app does not change existing vendors.`,
  };
}

async function settleFailedCreate({
  error,
  name,
}: {
  error: unknown;
  name: string;
}): Promise<QboVendorCreateResult> {
  if (!(error instanceof AppError)) throw error;

  const failure = classifyVendorCreateFailure({
    type: error.type,
    statusCode: error.statusCode,
    faultCodes: readFaultCodes(error.data),
  });
  if (failure === "rejected") throw error;

  const found = await findFreshVendor(name);

  if (failure === "uncertain") {
    if (found) return { status: "created", vendor: found };
    return {
      status: "unavailable",
      message:
        "QuickBooks did not answer, and the vendor is not in QuickBooks, so nothing was created. Try again.",
    };
  }

  // A duplicate name. Another admin may have just created it, so look before giving up.
  if (found) return describeExisting(found);
  return {
    status: "unavailable",
    message: `QuickBooks already has a customer, employee or vendor named "${name}". Choose a different name.`,
  };
}

export async function createQboVendor({
  displayName,
}: {
  displayName: string;
}): Promise<QboVendorCreateResult> {
  const problem = validateVendorName(displayName);
  if (problem) {
    throw new AppError({ message: problem, type: "VALIDATION_ERROR", statusCode: 400 });
  }
  const name = normalizeVendorName(displayName);

  const existing = await findFreshVendor(name);
  if (existing) return describeExisting(existing);

  // QuickBooks keeps one set of names across customers, vendors and employees, so a name held by
  // a customer or an employee is refused. Say so now, before sending anything.
  const heldByOther = await findFreshCustomerOrEmployeeName(name);
  if (heldByOther) {
    return {
      status: "unavailable",
      message: `"${heldByOther.name}" is already ${describeUsedNameEntity(heldByOther)} in QuickBooks, and every customer, vendor and employee needs a different name. Choose a different name.`,
    };
  }

  const body: QboVendorCreate = { DisplayName: name };
  let created: QboVendor | undefined;
  try {
    const response = await qboApi<{ Vendor?: QboVendor }>({
      path: "/vendor",
      method: "POST",
      pathTemplate: "/vendor",
      body,
    });
    created = response.Vendor;
  } catch (error) {
    return settleFailedCreate({ error, name });
  }

  if (created?.Id) return { status: "created", vendor: summarizeVendor(created) };

  // QuickBooks said yes but the body was not what we expect. Look before saying anything.
  const found = await findFreshVendor(name);
  if (found) return { status: "created", vendor: found };
  throw new AppError({
    message:
      "QuickBooks answered in an unexpected way and the vendor was not found. Check QuickBooks before trying again.",
    type: "EXTERNAL_ERROR",
    statusCode: 502,
    isOperational: true,
  });
}
