import {
  PrepayCore,
  PrepayDoc,
  PrepayDocProps,
  PrepayRaw,
} from "@/app/realGreen/prepay/PrepayTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapPrepay(raw: PrepayRaw): PrepayCore {
  return {
    prepayId: raw.id,
    description: raw.description,
    percent: raw.percent ?? 0,
  };
}

export function remapPrepays(raw: PrepayRaw[]): PrepayCore[] {
  return raw.map((p) => remapPrepay(p));
}

export async function extendPrepays(
  prepays: PrepayCore[],
): Promise<PrepayDoc[]> {
  return extendEntities<PrepayCore, PrepayDocProps, PrepayDoc>({
    cores: prepays,
    idField: "prepayId",
    baseDocProps: {} as PrepayDocProps,
  });
}
