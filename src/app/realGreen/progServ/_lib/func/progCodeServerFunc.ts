import {
  ProgCodeDoc,
  ProgCodeRaw,
  ProgCodeRemapped,
} from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export function remapProgramCode(raw: ProgCodeRaw): ProgCodeRemapped {
  return {
    progCodeId: raw.programCode,
    available: raw.available,
    description: raw.description,
    programType: raw.programType,
    progDefId: raw.programDefinitionID,
    unitCode: raw.unitCode || baseNumId,
  };
}

export function remapProgCodes(raw: ProgCodeRaw[]): ProgCodeRemapped[] {
  return raw.map(remapProgramCode);
}

export async function extendProgCodes(
  progCodes: ProgCodeRemapped[],
): Promise<ProgCodeDoc[]> {
  return progCodes as ProgCodeDoc[];
}
