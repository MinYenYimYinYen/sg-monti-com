export type RawFlag = {
  available: boolean;
  backgroundCOlor: number | null;
  emphasis: boolean;
  expirationDate: string | null;
  flagDescription: string;
  flagDescriptionFrench: string | null;
  flagDescriptionSpanish: string | null;
  foregroundColor: number | null;
  id: number;
  notes: string | null;
  showOnEstimate: boolean;
  showOnInvoice: boolean;
  sortOrder: number | null;
  symbol: number | null;
  websiteAvailable: boolean;
};

export type RemappedFlag = {
  flagId: number;
  available: boolean;
  description: string;
};

// export type MongoFlag = CreatedUpdated & {
//   id: string;
// };

export type Flag = RemappedFlag; // & MongoFlag;

export function remapFlag(raw: RawFlag): RemappedFlag {
  return {
    flagId: raw.id,
    available: raw.available,
    description: raw.flagDescription,
  };
}

// export function extendFlag({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedFlag;
//   mongo?: MongoFlag;
// }): Flag {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as Flag;
// }
//
// export function extendFlags({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedFlag[];
//   mongo: MongoFlag[];
// }): Flag[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.id);
//
//   return remapped.map((r) =>
//     extendFlag({
//       remapped: r,
//       mongo: mongoMap.get(r.id),
//     }),
//   );
// }