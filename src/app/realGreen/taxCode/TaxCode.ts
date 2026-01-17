export type RawTaxCode = {
  anyBranch: boolean;
  available: boolean;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  id: string;
  invoiceDescription: string;
  taxRate: number;
};

export type RemappedTaxCode = {
  taxCodeId: string;
  available: boolean;
  taxRate: number;
};

// export type MongoTaxCode = CreatedUpdated & {
//   id: string;
// };

export type TaxCode = RemappedTaxCode; // & MongoTaxCode;

export function remapTaxCode(raw: RawTaxCode): TaxCode {
  return {
    taxCodeId: raw.id,
    available: raw.available,
    taxRate: raw.taxRate,
  };
}

// export function extendTaxCode({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedTaxCode;
//   mongo?: MongoTaxCode;
// }): TaxCode {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as TaxCode;
// }
//
// export function extendTaxCodes({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedTaxCode[];
//   mongo: MongoTaxCode[];
// }): TaxCode[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.id);
//
//   return remapped.map((r) =>
//     extendTaxCode({
//       remapped: r,
//       mongo: mongoMap.get(r.id),
//     }),
//   );
// }