export type RawZipCode = {
  zip: string;
  taxID1: string | null;
  taxID2: string | null;
  taxID3: string | null;
  city: string;
  alternate1: string | null;
  alternate2: string | null;
  alternate3: string | null;
  alternate4: string | null;
  alternate5: string | null;
  alternate6: string | null;
  alternate7: string | null;
  alternate8: string | null;
  alternate9: string | null;
  cityDisplay: string | null;
  state: string | null;
  areaCode: string | null;
  companyID: number; // int32 in MongoDB corresponds to `number` in TypeScript
  route: string | null;
  territory: string | null;
  alternateCities: (string | null)[] | null; // Array of nullable strings
};

export type RemappedZipCode = {
  zip: string;
  city: string;
};

// export type MongoZipCode = CreatedUpdated & {
//   zip: string;
// };

export type ZipCode = RemappedZipCode // & MongoZipCode;

export function remapZipCode(raw: RawZipCode): ZipCode {
  return {
    zip: raw.zip,
    city: raw.city,
  };
}

// export function extendZipCode({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedZipCode;
//   mongo?: MongoZipCode;
// }): ZipCode {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as ZipCode;
// }
//
// export function extendZipCodes({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedZipCode[];
//   mongo: MongoZipCode[];
// }): ZipCode[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.zip);
//
//   return remapped.map((r) =>
//     extendZipCode({
//       remapped: r,
//       mongo: mongoMap.get(r.zip),
//     }),
//   );
// }