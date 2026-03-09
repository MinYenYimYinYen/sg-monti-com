import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";

export class ProgramQuery extends BaseQuery<Program> {
  constructor(programs: Program[]) {
    super(programs);
  }

  protected createInstance(items: Program[]): this {
    return new ProgramQuery(items) as this;
  }

  byStatus(status: string) {
    return new ProgramQuery(
      this.items.filter((p) => p.status === status)
    )
  }
}