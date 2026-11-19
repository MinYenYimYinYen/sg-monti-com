import { toCents } from "@/app/salesTax/_lib/buildSalesTaxReport";
import {
  MnTaxLine,
  RevenueGroupCustomerGap,
  RevenueGroupLineTotal,
  RevenueGroupProblem,
} from "@/app/salesTax/salesTaxTypes";
import { StateTaxRevenueGroup } from "@/app/salesTax/stateTaxRevenueGroups/StateTaxRevenueGroupTypes";

/**
 * The revenue groups whose lines do not report identical revenue. Only failing groups are returned.
 *
 * Each line's revenue is the sum of its customers' services, so two lines differ only when their
 * customer sets differ. The customer diff is therefore the real check and the revenue comparison
 * is a safety net; the gaps are what the user acts on. A group of one has nothing to compare, and
 * a member with no line this month counts as an empty line, because it is a gap too.
 */
export function findRevenueGroupProblems({
  mnTaxLines,
  groups,
}: {
  mnTaxLines: MnTaxLine[];
  groups: StateTaxRevenueGroup[];
}): RevenueGroupProblem[] {
  const lineByMnTaxCode = new Map(mnTaxLines.map((line) => [line.mnTaxType.code, line]));
  const problems: RevenueGroupProblem[] = [];

  for (const group of groups) {
    if (group.members.length < 2) continue;

    const mnTaxCodes = group.members.map((member) => member.mnTaxCode);
    const custIdsByMnTaxCode = new Map<string, Set<number>>();
    const lineTotals: RevenueGroupLineTotal[] = mnTaxCodes.map((mnTaxCode) => {
      const line = lineByMnTaxCode.get(mnTaxCode);
      const custIds = new Set((line?.summary.services ?? []).map((service) => service.custId));
      custIdsByMnTaxCode.set(mnTaxCode, custIds);
      return {
        mnTaxCode,
        netAfterAllDiscounts: line?.summary.netAfterAllDiscounts ?? 0,
        customerCount: custIds.size,
      };
    });

    const allCustIds = new Set([...custIdsByMnTaxCode.values()].flatMap((custIds) => [...custIds]));
    const customerGaps: RevenueGroupCustomerGap[] = [];
    for (const custId of [...allCustIds].sort((a, b) => a - b)) {
      const onMnTaxCodes = mnTaxCodes.filter((code) => custIdsByMnTaxCode.get(code)?.has(custId));
      if (onMnTaxCodes.length === mnTaxCodes.length) continue;
      customerGaps.push({
        custId,
        onMnTaxCodes,
        missingFromMnTaxCodes: mnTaxCodes.filter((code) => !onMnTaxCodes.includes(code)),
      });
    }

    const isRevenueDifferent =
      new Set(lineTotals.map((total) => toCents(total.netAfterAllDiscounts))).size > 1;
    if (customerGaps.length === 0 && !isRevenueDifferent) continue;

    problems.push({
      revenueGroupKey: group.revenueGroupKey,
      mnTaxCodes,
      lineTotals,
      customerGaps,
    });
  }

  return problems;
}
