import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export type MixChartRow = {
  size: number;
  amounts: number[];
};

export function generateMixChartData(
  master: ProductMaster,
  increment: number,
  maxSize: number,
): MixChartRow[] {
  const sizes: number[] = [];
  for (let size = increment; size <= maxSize; size += increment) {
    sizes.push(size);
  }

  return sizes.map((size) => ({
    size,
    amounts: master.subProductConfigs.map((config) => size * config.rate),
  }));
}
