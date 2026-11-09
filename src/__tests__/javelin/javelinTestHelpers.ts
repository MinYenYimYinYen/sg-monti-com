import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { LineTarget } from "@/app/javelin/_lib/entryBuild";

export function makeAccount(
  overrides: Partial<QboAccount> & Pick<QboAccount, "Id">,
): QboAccount {
  return {
    Name: `Account ${overrides.Id}`,
    SyncToken: "0",
    Active: true,
    AccountType: "Income",
    AccountSubType: "SalesOfProductIncome",
    FullyQualifiedName: `Account ${overrides.Id}`,
    SubAccount: false,
    ...overrides,
  };
}

export const testAccounts = new Map<string, QboAccount>([
  ["10", makeAccount({ Id: "10" })],
  ["20", makeAccount({ Id: "20" })],
  ["30", makeAccount({ Id: "30", AccountType: "Accounts Receivable" })],
]);

export function link(qboAccountId: string, extra: Partial<LineTarget> = {}): LineTarget {
  return { qboAccountId, ...extra };
}
