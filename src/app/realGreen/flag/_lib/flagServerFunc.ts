import {
  FlagCore,
  FlagDoc,
  FlagDocProps,
  FlagRaw,
} from "@/app/realGreen/flag/FlagTypes";
import { FlagDocPropsModel } from "@/app/realGreen/flag/models/FlagDocPropsModel";
import { baseFlagDocProps } from "@/app/realGreen/flag/_lib/baseFlag";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapFlag(raw: FlagRaw): FlagCore {
  return {
    flagId: raw.id,
    available: raw.available,
    desc: raw.flagDescription,
  };
}

export function remapFlags(raw: FlagRaw[]): FlagCore[] {
  return raw.map(remapFlag);
}

export async function extendFlags(cores: FlagCore[]): Promise<FlagDoc[]> {
  return extendEntities<FlagCore, FlagDocProps, FlagDoc>({
    cores,
    model: FlagDocPropsModel,
    idField: "flagId",
    baseDocProps: baseFlagDocProps,
  });
}
