import { CkDepositLinkKey, DepositLinkKey } from "@/app/javelin/JavelinTypes";
import { DEPOSIT_FIELD_LABELS, DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";

// Check deposits debit the checking account and credit the RealGreen check holding account, which
// moves the money from staged to deposited. Both are plain account links, stored beside the
// WorkWave field links but not part of the WorkWave field list.

export const CK_DEPOSIT_LINK_KEYS: CkDepositLinkKey[] = ["ckDepositAccount", "ckHoldingAccount"];

export const CK_DEPOSIT_LINK_LABELS: Record<CkDepositLinkKey, string> = {
  ckDepositAccount: "Checking Deposit Account",
  ckHoldingAccount: "RG Check Holding Acct",
};

export const DEPOSIT_LINK_KEYS: DepositLinkKey[] = [...DEPOSIT_FIELDS, ...CK_DEPOSIT_LINK_KEYS];

export const DEPOSIT_LINK_LABELS: Record<DepositLinkKey, string> = {
  ...DEPOSIT_FIELD_LABELS,
  ...CK_DEPOSIT_LINK_LABELS,
};
