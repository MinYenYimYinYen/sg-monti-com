type Range = {
  estimatedManHours: number | null;
  id: number;
  priceTableID: number;
  rate: number;
  size: number;
};

export type RawPriceTable = {
  available: boolean;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  id: number;
  interpolate: boolean;
  maxManHour: number;
  maxRate: number;
  maxSize: number;
  ranges: Range[];
  roundAmount: string | null;
  roundCalculatedPrices: string | null;
};

export type RemappedPriceTable = {
  id: number;
  available: boolean;
  description: string;
  maxRate: number;
  maxManHour: number;
  maxSize: number;

};

// export type MongoPriceTable = CreatedUpdated & {
//   id: number;
// };

export type PriceTable = RemappedPriceTable // & MongoPriceTable;

export function remapPriceTable(raw: RawPriceTable): RemappedPriceTable {
  return {
    id: raw.id,
    available: raw.available,
    description: raw.description,
    maxRate: raw.maxRate,
    maxManHour: raw.maxManHour,
    maxSize: raw.maxSize,
  };
}

// export function extendPriceTable({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedPriceTable;
//   mongo?: MongoPriceTable;
// }): PriceTable {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as PriceTable;
// }
//
// export function extendPriceTables({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedPriceTable[];
//   mongo: MongoPriceTable[];
// }): PriceTable[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.id);
//
//   return remapped.map((r) =>
//     extendPriceTable({
//       remapped: r,
//       mongo: mongoMap.get(r.id),
//     }),
//   );
// }