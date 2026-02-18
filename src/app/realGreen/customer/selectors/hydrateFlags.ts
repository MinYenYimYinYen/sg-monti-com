import { Flag, FlagDoc } from "@/app/realGreen/flag/FlagTypes";
import { baseFlag } from "@/app/realGreen/flag/_lib/baseFlag";

export function hydrateFlags(
  custId: number,
  custIdFlagIds: Map<number, number[]>,
  flagDocMap: Map<number, FlagDoc>,
): Flag[] {
  const flagIds = custIdFlagIds.get(custId) ?? [];
  return flagIds.map((flagId) => flagDocMap.get(flagId) || baseFlag);
}
