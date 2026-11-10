import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { AccountMappingNameType } from "@/app/account/AccountMappingTypes";
import { AccountLinkStatus } from "@/app/account/AccountMappingTypes";
import { DepositLinkKey } from "@/app/javelin/JavelinTypes";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

/**
 * Natural key: field. Links one deposit account to the QuickBooks account it posts to, like
 * AccountMappingDoc does for RealGreen accounts. The key is a WorkWave deposit export column, or
 * one of the two check deposit accounts. The QBO side is the QBO `Id`. The default name is the
 * customer or vendor posted on that line when the account takes one; both fields are set together
 * or not at all.
 */
export type DepositFieldMappingDoc = CreatedUpdated & {
  field: DepositLinkKey;
  qboAccountId: string;
  defaultNameType?: AccountMappingNameType;
  defaultNameId?: string;
};

/** One per deposit link key. This is the shape the mapping UI consumes. */
export type DepositFieldLink = {
  field: DepositLinkKey;
  qboAccount: QboAccount | null;
  status: AccountLinkStatus;
  nameType: AccountMappingNameType | null;
  defaultNameId: string | null;
};
