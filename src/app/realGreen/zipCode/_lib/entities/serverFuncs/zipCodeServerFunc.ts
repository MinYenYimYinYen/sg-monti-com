import {
  ZipCodeCore,
  ZipCodeDoc,
} from "@/app/realGreen/zipCode/_lib/entities/types/ZipCode";

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