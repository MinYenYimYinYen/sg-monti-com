import {
  PriceTable,
  PriceTableCore,
  PriceTableDoc,
  PriceTableDocProps,
  PriceTableProps,
} from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const basePriceTableCore: PriceTableCore = {
  tableId: baseNumId,
  desc: baseStrId,
  maxPrice: baseNumId,
  maxSize: baseNumId,
  ranges: [],
};

export const basePriceTableDocProps: PriceTableDocProps = {
  tableId: baseNumId,
  ranges: [],
  createdAt: "",
  updatedAt: "",
};

export const basePriceTableDoc: PriceTableDoc = {
  ...basePriceTableCore,
  ...basePriceTableDocProps,
};

export const basePriceTableProps: PriceTableProps = {};

export const basePriceTable: PriceTable = {
  ...basePriceTableDoc,
  ...basePriceTableProps,
};
