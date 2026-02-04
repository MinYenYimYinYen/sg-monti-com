import {
  ZipCodeCore,
  ZipCodeDoc,
  ZipCodeDocProps,
  ZipCodeRaw,
} from "@/app/realGreen/zipCode/_lib/ZipCodeTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapZipCode(raw: ZipCodeRaw): ZipCodeCore {
  return {
    zip: raw.zip,
    city: raw.city,
  };
}

export function remapZipCodes(raw: ZipCodeRaw[]) {
  return raw.map((r) => remapZipCode(r));
}

export async function extendZipCodes(
  remapped: ZipCodeCore[],
): Promise<ZipCodeDoc[]> {
  return extendEntities<ZipCodeCore, ZipCodeDocProps, ZipCodeDoc>({
    cores: remapped,
    idField: "zip",
    baseDocProps: {} as ZipCodeDocProps,
  });
}
