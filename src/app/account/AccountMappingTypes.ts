import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { RgAccount } from "@/app/realGreen/rgAccount/RgAccountTypes";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

/**
 * Which kind of QBO name a mapping can carry. QuickBooks requires a Customer on an Accounts
 * Receivable line and a Vendor on an Accounts Payable line, and accepts no name on others.
 */
export type AccountMappingNameType = "Customer" | "Vendor";

/**
 * The only stored account data: a link from a RealGreen account to a QuickBooks account.
 * Several RealGreen accounts may share one QBO account, so only rgAccountId is unique.
 * The QBO side is the QBO `Id`, not `AcctNum`, because AcctNum is optional and editable.
 *
 * The default name is the customer or vendor posted on this account's journal lines, saved on
 * its QBO `Id`. Both fields are set together or not at all.
 */
export type AccountMappingDoc = CreatedUpdated & {
  rgAccountId: string;
  qboAccountId: string;
  defaultNameType?: AccountMappingNameType;
  defaultNameId?: string;
};

/**
 * - unmapped: no link stored.
 * - mapped: link points at an active QBO account.
 * - inactive: link points at a QBO account that cannot be posted to.
 * - missing: link points at an Id that QBO no longer returns.
 * - unverified: a link exists but QBO accounts have not loaded, so it cannot be checked.
 * - needsName: link points at an Accounts Receivable account with no usable default customer.
 *   An Accounts Payable account never gets this status, because its vendor is optional.
 */
export type AccountLinkStatus =
  | "unmapped"
  | "mapped"
  | "inactive"
  | "missing"
  | "unverified"
  | "needsName";

/** One per RealGreen account. This is the shape the mapping UI consumes. */
export type RgAccountLink = {
  rgAccount: RgAccount;
  qboAccount: QboAccount | null;
  status: AccountLinkStatus;
  /** The kind of name the linked QBO account takes, or null when it takes none (or is not linked). */
  nameType: AccountMappingNameType | null;
  /** The stored default name's QBO Id, or null when none is stored. */
  defaultNameId: string | null;
};

/** One per QBO account, with every RealGreen account that maps to it. */
export type QboAccountLink = {
  qboAccount: QboAccount;
  rgAccounts: RgAccount[];
};
