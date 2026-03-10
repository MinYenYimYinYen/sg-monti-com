import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { Condition } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

export class ServiceUtils {
  constructor(private readonly service: Omit<Service, "x">) {}

  public get customer(): Customer {
    return this.service.program.customer;
  }

  public get doneBys(): DoneBy[] | null {
    return this.service.production?.doneBys || null;
  }

  public get doneDate(): string | null {
    const timeRange = this.service.production?.timeRange || null;
    return timeRange?.max || null;
  }

  public get productsUsed(): AppProduct[] | null {
    return this.service.production?.usedAppProducts || null;
  }

  public get conditions(): Condition[] | null {
    const serviceConditions =
      this.service.production?.serviceConditions || null;
    if (serviceConditions) {
      return serviceConditions.map((sc) => sc.condition);
    } else {
      return null;
    }
  }

  public get allTechNotes(): string[] {
    const check = [
      this.service.techNote.length
        ? `Service(${this.service.servCodeId}): ` + this.service.techNote
        : undefined,
      this.service.program.techNote.length
        ? `Program(${this.service.program.progCode.progCodeId}): ` +
          this.service.program.techNote
        : undefined,
      this.service.program.customer.techNote.length
        ? "Customer: " + this.service.program.customer.techNote
        : undefined,
    ];
    return typeGuard.definedArray(check);
  }

  public get callAheads(): CallAhead[] {
    const servCallAhead = this.service.callAhead;
    const progCallAhead = this.service.program.callAhead;
    const custCallAhead = this.service.program.customer.callAhead;
    const callAheads = typeGuard.definedArray([
      servCallAhead,
      progCallAhead,
      custCallAhead,
    ]);
    return callAheads;
  }

  public get isPest(): boolean {
    return this.service.program.progCode.programType === "H";
  }
}
