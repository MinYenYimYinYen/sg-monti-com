import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";

export type PaceCategory = "asap" | "overdue" | "inProgress" | "notStarted" | "notSet";

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;

  category: PaceCategory

  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;

  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;
};
