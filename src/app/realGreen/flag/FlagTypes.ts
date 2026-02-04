import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type FlagRaw = {
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

export type FlagCore = {
  flagId: number;
  available: boolean;
  desc: string;
};

export type FlagDocProps = CreatedUpdated & {
  flagId: number;
  isOnCoverSheet: boolean;
};

export type FlagDoc = FlagDocProps & FlagCore;


export type FlagProps = {};

export type Flag = FlagProps & FlagDoc;

// export function extendFlag({
//   remapped,
//   mongo,
// }: {
//   remapped: FlagCore;
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
//   remapped: FlagCore[];
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