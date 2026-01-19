import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type RawProgServ = {
  id: number;
  programDefinitionID: number;
  serviceCode: string | null;
  round: number | null;
  isDependent: boolean;
  do: boolean;
  skipAfter: string | null;
};

export type RemappedProgServ = {
  progServId: number;
  progDefId: number;
  servCodeId: string | null;
  round: number | null;
  isDependent: boolean;
  do: boolean;
  skipAfter: string | null;
};

// export type MongoProgServ = CreatedUpdated & {
//   id: string;
// };

export type ProgServ = RemappedProgServ & CreatedUpdated; // & MongoProgServ;

 function remapProgServ(raw: RawProgServ): RemappedProgServ {
  return {
    progServId: raw.id,
    progDefId: raw.programDefinitionID,
    servCodeId: raw.serviceCode,
    round: raw.round,
    isDependent: raw.isDependent,
    do: raw.do,
    skipAfter: raw.skipAfter,
  };
}

export function remapProgServs(raw: RawProgServ[]) {
  return raw.map(remapProgServ);
}

// export function extendProgServ({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedProgServ;
//   mongo?: MongoProgServ;
// }): ProgServ {
//   return {
//     ...remapped,
//     createdAt: mongo?.createdAt,
//     updatedAt: mongo?.updatedAt,
//   } as ProgServ;
// }
//
// export function extendProgServs({
//   remapped,
//   mongo,
// }: {
//   remapped: RemappedProgServ[];
//   mongo: MongoProgServ[];
// }): ProgServ[] {
//   const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.id);
//
//   return remapped.map((r) =>
//     extendProgServ({
//       remapped: r,
//       mongo: mongoMap.get(r.id),
//     }),
//   );
// }
