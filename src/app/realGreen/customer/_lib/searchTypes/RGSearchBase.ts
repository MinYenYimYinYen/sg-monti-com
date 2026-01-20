import {RGStringRange} from "@/app/realGreen/_lib/subTypes/RGSearchRanges";

export type RGSearchBase = {
  created?: RGStringRange;
  updated?: RGStringRange;
  offset?: number;
  records?: number;
};