import { ZipCodeCore, ZipCodeRaw } from "../types/ZipCode";

function remapZipCode(raw: ZipCodeRaw): ZipCodeCore {
  return {
    zip: raw.zip,
    city: raw.city,
  };
}

export function remapZipCodes(raw: ZipCodeRaw[]) {
  return raw.map((r) => remapZipCode(r));
}
