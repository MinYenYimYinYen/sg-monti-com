import {
  PriceTableCore,
  PriceTableDoc,
  PriceTableRaw,
} from "@/app/realGreen/priceTable/_entities/PriceTableTypes";
import {
  PriceRangeCore,
  PriceRangeDoc,
  PriceRangeRaw,
} from "@/app/realGreen/priceTable/_entities/PriceRangeType";

function remapPriceTable(raw: PriceTableRaw): Omit<PriceTableCore, "ranges"> {
  return {
    tableId: raw.id,
    description: raw.description,
    maxRate: raw.maxRate,
    maxSize: raw.maxSize,
  };
}

export function remapPriceTables(raw: PriceTableRaw[]): Omit<PriceTableCore, "ranges">[] {
  return raw.map(remapPriceTable);
}

export async function extendPriceTables(
  priceTables: Omit<PriceTableCore, "ranges">[],
): Promise<Omit<PriceTableDoc, "ranges">[]> {
  return priceTables as Omit<PriceTableDoc, "ranges">[];
}

function remapPriceRange(raw: PriceRangeRaw): PriceRangeCore {
  return {
    tableId: raw.priceTableID,
    priceId: raw.id,
    size: raw.size,
    price: raw.rate,
  };
}

export function remapPriceRanges(raw: PriceRangeRaw[]): PriceRangeCore[] {
  return raw.map(remapPriceRange);
}

export function extendPriceRanges(
  priceRanges: PriceRangeCore[],
): PriceRangeDoc[] {
  return priceRanges as PriceRangeDoc[];
}


