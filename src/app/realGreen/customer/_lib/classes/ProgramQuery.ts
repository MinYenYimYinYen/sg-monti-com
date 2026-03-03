import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

export class ProgramQuery {
  constructor( private programs: Program[]) {}

  byStatus(status: string) {
    return new ProgramQuery(
      this.programs.filter((p) => p.status === status)
    )
  }
}