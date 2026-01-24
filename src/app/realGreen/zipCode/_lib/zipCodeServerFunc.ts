import {
  ZipCodeCore,
  ZipCodeDoc,
  ZipCodeRaw,
} from "@/app/realGreen/zipCode/_lib/ZipCodeTypes";

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
  // MOCKED: In a real scenario, we would fetch Mongo data here
  const withMongo = remapped.map((zip) => ({
    ...zip,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}
