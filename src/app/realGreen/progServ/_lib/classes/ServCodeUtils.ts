import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export class ServCodeUtils {
  constructor(private readonly servCode: Omit<ServCode, "x">) {}

  public get progCodeId(): string {
    return this.servCode.progCodeId;
  }

  public get isServiceCall(): boolean {
    return this.servCode.isServiceCall;
  }
}
