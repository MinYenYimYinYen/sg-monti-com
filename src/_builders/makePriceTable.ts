import type { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { basePriceTableDoc } from "@/app/realGreen/priceTable/_lib/basePriceTable";

/** Defaults to a table with no ranges, which prices nothing (`getPriceChartPrice` returns null). */
export function makePriceTable(overrides: Partial<PriceTable> = {}): PriceTable {
  return { ...basePriceTableDoc, ...overrides };
}
