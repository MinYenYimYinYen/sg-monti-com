import { FlagCore, FlagDoc, FlagRaw } from "@/app/realGreen/flag/FlagTypes";

function remapFlag(raw: FlagRaw): FlagCore {
  return {
    flagId: raw.id,
    available: raw.available,
    description: raw.flagDescription,
  };
}

export function remapFlags(raw: FlagRaw[]): FlagCore[] {
  return raw.map(remapFlag);
}

export async function extendFlags(cores: FlagCore[]): Promise<FlagDoc[]> {
  return cores as FlagDoc[];
}
