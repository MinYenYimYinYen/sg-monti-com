import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

/**
 * A single-range price chart: every size up to 20 is priced at 150 per visit.
 * `sampleCustomer` has size 15, so each upsell service prices at 150.
 */
export const sampleUpsellPriceTable: PriceTable = {
  available: true,
  priceTableId: 9001,
  desc: "Sample Upsell Price Table",
  maxPrice: 0,
  maxSize: 20,
  ranges: [{ priceId: 1, tableId: 9001, size: 20, price: 150 }],
  createdAt: "",
  updatedAt: "",
};

/**
 * The sample proposed program for prepay letter previews: "Some Upsell Program",
 * two services at 150 each for a customer of size 15.
 *
 * Built through `generateCustomer` so the ProgCode and its ServCodes are wired
 * exactly like runtime data. Only the ProgCode is kept — an upsell is a proposal,
 * not a program on the customer.
 */
export const sampleUpsellProgCode: ProgCode = generateCustomer({
  programs: [
    {
      progCode: {
        progCodeId: "PC-UPSELL",
        description: "Some Upsell Program",
        priceTable: sampleUpsellPriceTable,
      },
      services: [
        {
          servCode: {
            servCodeId: "S-UPSELL-1",
            name: "Upsell Visit 1",
            longName: "Some Upsell - First Visit",
          },
        },
        {
          servCode: {
            servCodeId: "S-UPSELL-2",
            name: "Upsell Visit 2",
            longName: "Some Upsell - Second Visit",
          },
        },
      ],
    },
  ],
}).programs[0]!.progCode;
