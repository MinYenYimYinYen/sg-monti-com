import {
  ProgramCore,
  ProgramDoc,
} from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

export async function extendPrograms(
  remapped: ProgramCore[],
): Promise<ProgramDoc[]> {
  const withMongo = remapped.map((prog) => ({
    ...prog,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}