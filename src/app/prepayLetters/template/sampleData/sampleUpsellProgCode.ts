import { makeProgCode } from "@/_builders/makeProgCode";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { sampleUpsellPriceTable } from "@/app/prepayLetters/template/sampleData/sampleUpsellPriceTable";

/**
 * The sample proposed program for prepay letter previews: "Some Upsell Program",
 * two services at 150 each for a customer of size 15.
 *
 * Only the ProgCode exists: an upsell is a proposal, not a program on the customer.
 */
export const sampleUpsellProgCode: ProgCode = makeProgCode({
  progCode: {
    progCodeId: "PC-UPSELL",
    description: "Some Upsell Program",
    priceTable: sampleUpsellPriceTable,
  },
  servCodes: [
    {
      servCodeId: "S-UPSELL-1",
      name: "Upsell Visit 1",
      longName: "Some Upsell - First Visit",
    },
    {
      servCodeId: "S-UPSELL-2",
      name: "Upsell Visit 2",
      longName: "Some Upsell - Second Visit",
    },
  ],
});
