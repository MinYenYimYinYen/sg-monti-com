import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export type MixChartAmount = {
  amount: number;
  unit: string;
};

export type MixChartRow = {
  size: number;
  amounts: MixChartAmount[];
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
    amounts: master.subProductConfigs.map((config) => ({
      amount: size * config.rate,
      unit: config.subProduct.unit.desc,
    })),
  }));
}
