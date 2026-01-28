import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

const basePriceTable: PriceTable = {
  tableId: baseNumId,
  desc: baseStrId,
  ranges: [],
  maxPrice: baseNumId,
  maxSize: baseNumId,
  createdAt: "",
  updatedAt: "",
};
