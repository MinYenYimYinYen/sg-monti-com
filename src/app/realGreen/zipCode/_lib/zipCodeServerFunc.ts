import {
  ZipCodeCore,
  ZipCodeDoc,
  ZipCodeDocProps,
  ZipCodeRaw,
} from "@/app/realGreen/zipCode/_lib/ZipCodeTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

function remapZipCode(raw: ZipCodeRaw): ZipCodeCore {
  const maybeTaxIds = [raw.taxID1, raw.taxID2, raw.taxID3];
  const taxIds = typeGuard.definedArray(maybeTaxIds);
  const altCities = typeGuard.definedArray(raw.alternateCities ?? []);
  return {
    zip: raw.zip,
    city: raw.city,
    taxIds,
    altCities,
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
