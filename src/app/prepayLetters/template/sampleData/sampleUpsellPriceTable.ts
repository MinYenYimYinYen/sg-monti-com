import { makePriceTable } from "@/_builders/makePriceTable";
import type { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

/**
 * A single-range price chart: every size up to 20 is priced at 150 per visit.
 * `sampleCustomer` has size 15, so each upsell service prices at 150.
 */
export const sampleUpsellPriceTable: PriceTable = makePriceTable({
  priceTableId: 9001,
  desc: "Sample Upsell Price Table",
  maxPrice: 0,
  maxSize: 20,
  ranges: [{ priceId: 1, tableId: 9001, size: 20, price: 150 }],
});
