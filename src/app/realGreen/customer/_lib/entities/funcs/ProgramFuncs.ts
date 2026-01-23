import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { ProgramCore, ProgramRaw } from "../types/ProgramTypes";

function remapProgram(raw: ProgramRaw): ProgramCore {
  return {
    avgPrice: raw.averagePrice,
    billingType: raw.billingType,
    callAheadId: raw.callAhead || baseNumId,
    custId: raw.customerNumber,
    dateSold: raw.dateSold,
    discountId: raw.discountCodeId,
    progId: raw.id,
    isFullProgram: raw.isFullProgram,
    lastPriceChange: raw.lastPriceChange || "",
    nextDate: raw.nextDate || "",
    price: raw.price,
    progDefId: raw.programCodeId || baseNumId,
    season: raw.season,
    soldBy: [raw.soldby1, raw.soldby2].filter(Boolean) as string[],
    sourceCodeId: raw.sourceCode,
    status: raw.status,
    techNote: raw.technicianNote,
    tempSeq: raw.temporarySequence,
  };
}

export function remapPrograms(raw: ProgramRaw[]) {
  return raw.map((r) => remapProgram(r));
}
