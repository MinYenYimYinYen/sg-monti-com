import { PostContext } from "@/app/qbo/importCCTxn/_lib/importPostContextUtils";
import {
  makeCardAccount,
  makeExpenseAccount,
  makeMapping,
  makeVendorSummary,
} from "@/__tests__/qbo/importCCTxn/importTestHelpers";

/** A context where "ANTHROPIC" maps to vendor 77 and expense account 13, and Capital One posts to card 42. */
export function makeContext(overrides: Partial<PostContext> = {}): PostContext {
  const mapping = makeMapping({ merchantKey: "ANTHROPIC", vendorId: "77", defaultAccountId: "13" });
  return {
    mappingMap: new Map([[mapping.merchantKey, mapping]]),
    cardAssignmentMap: new Map(),
    formatAccountMap: new Map([
      ["capitalOne", { formatId: "capitalOne", accountIds: ["42"], defaultAccountId: "42" }],
    ]),
    vendorMap: new Map([["77", makeVendorSummary({ Id: "77" })]]),
    accountMap: new Map([
      ["13", makeExpenseAccount({ Id: "13" })],
      ["42", makeCardAccount({ Id: "42" })],
    ]),
    bookCloseDate: null,
    ...overrides,
  };
}
