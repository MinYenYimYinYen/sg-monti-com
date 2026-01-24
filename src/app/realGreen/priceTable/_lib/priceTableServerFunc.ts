import {
  PriceTableCore,
  PriceTableDoc,
  PriceTableRaw,
} from "@/app/realGreen/priceTable/_entities/PriceTableTypes";

function remapPriceTable(raw: PriceTableRaw): PriceTableCore {
  return {
    id: raw.id,
    description: raw.description,
    maxRate: raw.maxRate,
    maxManHour: raw.maxManHour,
    maxSize: raw.maxSize,
  };
}

export function remapPriceTables(raw: PriceTableRaw[]): PriceTableCore[] {
  return raw.map(remapPriceTable);
}

export async function extendPriceTables(
  priceTables: PriceTableCore[],
): Promise<PriceTableDoc[]> {
  return priceTables as PriceTableDoc[];
}
