import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { CompoundUnitDisplay } from "@/app/realGreen/product/_lib/utils/unitConfigDisplay";

export type MixChartAmount = CompoundUnitDisplay;

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
    amounts: master.subProductConfigs.map((config) => {
      const appAmount = size * config.rate;
      // Use unitConfigDisplay to format compound units
      return config.subProduct.unitConfigDisplay.format({
        amount: appAmount,
        targetContexts: ["load", "app"],
      });
    }),
  }));
}
