import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export type LookbackConfig = {
  lookbackStart: string;
  completionThreshold: number;
};

export const DEFAULT_LOOKBACK_CONFIG: LookbackConfig = {
  lookbackStart: dateStrings.yearStart(),
  completionThreshold: 0.5,
};
