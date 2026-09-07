import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { SeasonIncrease } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";

export type SeasonIncreasesDoc = CreatedUpdated & {
  seasonIncreasesId: string;
  label: string;
  seasonIncreases: SeasonIncrease[];
};
